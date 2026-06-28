import { prisma, Prisma } from "@nuru/db";
import type {
  CheckoutInput,
  OrderDTO,
  OrderQuery,
  OrderStatus,
  Paginated,
  PaymentStatus,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { toOrderDTO, type OrderWithItems } from "./serializers.js";

const withItems = { include: { items: true } } as const;

function buildWhere(query: OrderQuery, scopeUserId?: string): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  // A user scope (customer "my orders") always wins over any client-sent userId.
  if (scopeUserId) where.userId = scopeUserId;
  else if (query.userId) where.userId = query.userId;

  if (query.status) where.status = query.status;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;

  if (query.search) {
    where.OR = [
      { orderNumber: { contains: query.search, mode: "insensitive" } },
      { contactName: { contains: query.search, mode: "insensitive" } },
      { contactPhone: { contains: query.search, mode: "insensitive" } },
      { contactEmail: { contains: query.search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(sort: OrderQuery["sort"]): Prisma.OrderOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "total_asc":
      return { total: "asc" };
    case "total_desc":
      return { total: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

async function listOrders(
  query: OrderQuery,
  scopeUserId?: string,
): Promise<Paginated<OrderDTO>> {
  const where = buildWhere(query, scopeUserId);
  const skip = (query.page - 1) * query.pageSize;

  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: buildOrderBy(query.sort),
      skip,
      take: query.pageSize,
      include: { items: true },
    }),
  ]);

  return {
    items: rows.map((r) => toOrderDTO(r as OrderWithItems)),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/** Admin listing — every order, filterable. */
export function adminList(query: OrderQuery): Promise<Paginated<OrderDTO>> {
  return listOrders(query);
}

/** Customer listing — scoped to the authenticated user's own orders. */
export function listForUser(userId: string, query: OrderQuery): Promise<Paginated<OrderDTO>> {
  return listOrders(query, userId);
}

export async function adminGetById(id: string): Promise<OrderDTO> {
  const row = await prisma.order.findUnique({ where: { id }, ...withItems });
  if (!row) throw Errors.notFound("Order not found.");
  return toOrderDTO(row as OrderWithItems);
}

/**
 * Public order tracking by the unguessable order number (acts as a capability
 * token for guest confirmation pages).
 */
export async function getByOrderNumber(orderNumber: string): Promise<OrderDTO> {
  const row = await prisma.order.findUnique({ where: { orderNumber }, ...withItems });
  if (!row) throw Errors.notFound("Order not found.");
  return toOrderDTO(row as OrderWithItems);
}

/**
 * Create an order from a cart. Re-reads every product server-side, validates
 * availability + stock, snapshots the live price/name/image, decrements stock
 * atomically, and persists the order — all in a single transaction so a partial
 * failure never leaves stock or orders inconsistent.
 */
export async function checkout(input: CheckoutInput, userId?: string): Promise<OrderDTO> {
  // Collapse duplicate product lines so stock checks see the true total.
  const quantityByProduct = new Map<string, number>();
  for (const line of input.items) {
    quantityByProduct.set(
      line.productId,
      (quantityByProduct.get(line.productId) ?? 0) + line.quantity,
    );
  }
  const productIds = [...quantityByProduct.keys()];

  const order = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    let subtotal = new Prisma.Decimal(0);
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    for (const [productId, quantity] of quantityByProduct) {
      const product = byId.get(productId);
      if (!product) throw Errors.badRequest("A product in your cart is no longer available.");
      if (!product.isActive) {
        throw Errors.badRequest(`"${product.name}" is no longer available.`);
      }
      if (product.stock < quantity) {
        throw Errors.conflict(
          `Only ${product.stock} of "${product.name}" left in stock.`,
        );
      }

      // Charge the selling price when set, otherwise the list price.
      const unitPrice = new Prisma.Decimal((product.sellingPrice ?? product.price).toString());
      subtotal = subtotal.add(unitPrice.mul(quantity));

      orderItems.push({
        product: { connect: { id: product.id } },
        productName: product.name,
        unitPrice,
        quantity,
        imageUrl: product.images[0] ?? null,
      });

      // Conditional decrement guards against a concurrent checkout draining stock
      // between the read above and this write.
      const res = await tx.product.updateMany({
        where: { id: product.id, stock: { gte: quantity } },
        data: { stock: { decrement: quantity } },
      });
      if (res.count === 0) {
        throw Errors.conflict(`"${product.name}" just went out of stock.`);
      }
    }

    // Wallet redemption is deferred to the wallet module; total === subtotal here.
    return tx.order.create({
      data: {
        userId: userId ?? null,
        subtotal,
        walletApplied: new Prisma.Decimal(0),
        total: subtotal,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail ?? null,
        address: input.address,
        note: input.note ?? null,
        items: { create: orderItems },
      },
      include: { items: true },
    });
  });

  return toOrderDTO(order as OrderWithItems);
}

/**
 * Update order status. Entering CANCELLED from a live state restores the stock
 * reserved by the order's line items, atomically with the status write.
 */
export async function updateStatus(id: string, status: OrderStatus): Promise<OrderDTO> {
  const order = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!current) throw Errors.notFound("Order not found.");

    const alreadyReleased = current.status === "CANCELLED" || current.status === "REFUNDED";
    if (status === "CANCELLED" && !alreadyReleased) {
      for (const item of current.items) {
        if (!item.productId) continue;
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return tx.order.update({ where: { id }, data: { status }, include: { items: true } });
  });

  return toOrderDTO(order as OrderWithItems);
}

export async function updatePayment(
  id: string,
  paymentStatus: PaymentStatus,
): Promise<OrderDTO> {
  const current = await prisma.order.findUnique({ where: { id }, select: { id: true } });
  if (!current) throw Errors.notFound("Order not found.");

  const order = await prisma.order.update({
    where: { id },
    data: { paymentStatus },
    include: { items: true },
  });
  return toOrderDTO(order as OrderWithItems);
}

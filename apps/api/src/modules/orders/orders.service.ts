import { createHash, randomUUID } from "node:crypto";
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
import { creditWallet, debitWallet, rewardReferralOnFirstOrder } from "../wallet/ledger.js";
import { toOrderDTO, type OrderWithItems } from "./serializers.js";
import { loadEffectivePrices } from "../merchandising/pricing.service.js";

const withItems = { include: { items: true } } as const;

async function serializableTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!retryable || attempt === 3) throw error;
    }
  }
  throw Errors.internal("Checkout transaction could not be completed.");
}

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
  const guestActor = input.anonymousId ?? `guest:${createHash("sha256").update(input.contactPhone.trim()).digest("hex")}`;

  const order = await serializableTransaction(async (tx) => {
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const byId = new Map(products.map((p) => [p.id, p]));
    // Promotions are resolved from their own time-bound layer. Product base/
    // selling prices are never mutated when a campaign starts or expires.
    const effectivePrices = await loadEffectivePrices(tx, products);

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

      const effective = effectivePrices.get(product.id);
      const unitPrice = effective?.effectivePrice ?? new Prisma.Decimal((product.sellingPrice ?? product.price).toString());
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
      if (product.stock - quantity === 0) {
        await tx.notification.create({
          data: {
            recipientType: "ADMIN",
            recipientId: null,
            title: "Product out of stock",
            body: `${product.name} is now out of stock.`,
            type: "inventory",
            relatedId: product.id,
          },
        });
      }
    }

    // Decide how much wallet credit to apply — server-side only. The amount is
    // capped at the live balance and the subtotal; the client only opts in.
    let walletApplied = new Prisma.Decimal(0);
    if (userId && input.useWallet) {
      const wallet = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true },
      });
      const balance = new Prisma.Decimal((wallet?.walletBalance ?? 0).toString());
      if (balance.greaterThan(0)) {
        walletApplied = balance.greaterThan(subtotal) ? subtotal : balance;
      }
    }
    const total = subtotal.sub(walletApplied);

    const created = await tx.order.create({
      data: {
        userId: userId ?? null,
        subtotal,
        walletApplied,
        total,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail ?? null,
        address: input.address,
        note: input.note ?? null,
        items: { create: orderItems },
      },
      include: { items: true },
    });
    await tx.commerceEvent.createMany({
      data: [...quantityByProduct].map(([productId, quantity]) => ({
        eventId: randomUUID(),
        eventType: "purchase_completed",
        userId: userId ?? null,
        anonymousId: userId ? null : guestActor,
        productId,
        trusted: true,
        occurredAt: new Date(),
        source: "checkout",
        metadata: {
          orderId: created.id,
          quantity,
          revenue: (effectivePrices.get(productId)?.effectivePrice ?? new Prisma.Decimal(0)).mul(quantity).toString(),
        },
      })),
    });

    // Reserve campaign inventory in the same transaction as stock/order. The
    // conditional counters make promotion limits safe during traffic spikes.
    for (const [productId, quantity] of quantityByProduct) {
      const effective = effectivePrices.get(productId);
      if (!effective?.promotionId || !effective.promotionProductId) continue;
      const campaign = await tx.promotion.findUnique({ where: { id: effective.promotionId } });
      const promotionProduct = await tx.promotionProduct.findUnique({ where: { id: effective.promotionProductId } });
      if (!campaign || !promotionProduct) throw Errors.conflict("A promotion changed during checkout. Please retry.");

      const actorWhere = userId
        ? { userId }
        : { anonymousId: guestActor };
      const redeemed = await tx.promotionRedemption.aggregate({
        where: { promotionId: campaign.id, ...actorWhere },
        _sum: { quantity: true },
      });
      const customerLimit = promotionProduct.perCustomerLimit ?? campaign.perCustomerLimit;
      if (customerLimit != null && (redeemed._sum.quantity ?? 0) + quantity > customerLimit) {
        throw Errors.conflict("Promotion purchase limit reached for this customer.");
      }

      const campaignReserved = await tx.promotion.updateMany({
        where: {
          id: campaign.id,
          ...(campaign.inventoryLimit != null
            ? { purchasedCount: { lte: campaign.inventoryLimit - quantity } }
            : {}),
        },
        data: { purchasedCount: { increment: quantity } },
      });
      const productReserved = await tx.promotionProduct.updateMany({
        where: {
          id: promotionProduct.id,
          ...(promotionProduct.inventoryLimit != null
            ? { purchasedCount: { lte: promotionProduct.inventoryLimit - quantity } }
            : {}),
        },
        data: { purchasedCount: { increment: quantity } },
      });
      if (!campaignReserved.count || !productReserved.count) {
        throw Errors.conflict("This promotion has just sold out.");
      }
      const product = byId.get(productId)!;
      const base = new Prisma.Decimal((product.sellingPrice ?? product.price).toString());
      await tx.promotionRedemption.create({
        data: {
          promotionId: campaign.id,
          promotionProductId: promotionProduct.id,
          productId,
          orderId: created.id,
          userId: userId ?? null,
          anonymousId: userId ? null : guestActor,
          quantity,
          unitDiscount: base.sub(effective.effectivePrice),
        },
      });
    }

    // Deduct the applied credit from the wallet ledger, atomically with the order.
    if (userId && walletApplied.greaterThan(0)) {
      await debitWallet(tx, userId, walletApplied, "REDEEM", { orderId: created.id });
    }
    if (userId) {
      await tx.user.update({
        where: { id: userId },
        data: {
          name: input.contactName.trim() || undefined,
          phone: input.contactPhone.trim() || undefined,
          address: input.address.trim() || undefined,
        },
      });
    }
    // Pay a referrer once their referred user makes their first purchase.
    if (userId) await rewardReferralOnFirstOrder(tx, userId);

    return created;
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
      await tx.commerceEvent.createMany({
        data: current.items.flatMap((item) => item.productId ? [{
          eventId: randomUUID(),
          eventType: "order_cancelled",
          userId: current.userId,
          productId: item.productId,
          trusted: true,
          occurredAt: new Date(),
          source: "order_status",
          metadata: { orderId: current.id, quantity: item.quantity },
        }] : []),
      });
    }

    // Return any wallet credit spent on the order when it is voided (cancelled or
    // refunded), guarded so it happens exactly once.
    const enteringReleased = status === "CANCELLED" || status === "REFUNDED";
    if (enteringReleased && !alreadyReleased && current.userId) {
      const applied = new Prisma.Decimal((current.walletApplied ?? 0).toString());
      if (applied.greaterThan(0)) {
        await creditWallet(tx, current.userId, applied, "REFUND", { orderId: current.id });
      }
    }

    return tx.order.update({ where: { id }, data: { status }, include: { items: true } });
  });

  return toOrderDTO(order as OrderWithItems);
}

/** How long after placing an order a customer may still cancel it themselves. */
const SELF_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Statuses a customer may self-cancel from (pre-shipment, live states only). */
const SELF_CANCELLABLE: ReadonlySet<OrderStatus> = new Set(["PENDING", "CONFIRMED", "PROCESSING"]);

/**
 * Customer self-cancel: only the order's owner, only from a pre-shipment state,
 * and only within {@link SELF_CANCEL_WINDOW_MS} of placing it. Delegates to
 * {@link updateStatus} so stock + wallet credit are released atomically.
 * A non-owner is given a 404 (not 403) so order existence isn't leaked.
 */
export async function cancelOwnOrder(userId: string, orderNumber: string): Promise<OrderDTO> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: { id: true, userId: true, status: true, createdAt: true },
  });
  if (!order || order.userId !== userId) throw Errors.notFound("Order not found.");
  if (!SELF_CANCELLABLE.has(order.status)) {
    throw Errors.badRequest("This order can no longer be cancelled.");
  }
  if (Date.now() - order.createdAt.getTime() > SELF_CANCEL_WINDOW_MS) {
    throw Errors.badRequest("The 24-hour cancellation window for this order has passed.");
  }
  return updateStatus(order.id, "CANCELLED");
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

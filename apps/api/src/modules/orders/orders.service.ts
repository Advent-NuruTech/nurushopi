import { createHash, randomUUID } from "node:crypto";
import { prisma, Prisma } from "@nuru/db";
import {
  productVariantsSchema,
  type CheckoutInput,
  type DeliveryFeeStatus,
  type FulfillmentMethod,
  type OrderDeliveryQuoteInput,
  type OrderDTO,
  type OrderQuery,
  type OrderStatus,
  type Paginated,
  type PaymentStatus,
  type OrderStatusActorType,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { resolveDeliveryQuote } from "../fulfillment/fulfillment.service.js";
import { creditWallet, debitWallet, rewardReferralOnFirstOrder } from "../wallet/ledger.js";
import { toOrderDTO, type OrderWithItems } from "./serializers.js";
import { loadEffectivePrices } from "../merchandising/pricing.service.js";
import { sendPickupReadyEmail } from "../auth/email.js";
import { logger } from "../../lib/logger.js";

const orderRelations = {
  items: true,
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  notificationDeliveries: true,
} as const;
const withItems = { include: orderRelations } as const;

export interface OrderStatusActor {
  type: OrderStatusActorType;
  id?: string;
  name?: string;
  note?: string | null;
}

type FulfillmentGate = {
  featureEnabled: boolean;
  pickupEnabled: boolean;
  doorstepEnabled: boolean;
};

const disabledGate: FulfillmentGate = {
  featureEnabled: false,
  pickupEnabled: false,
  doorstepEnabled: false,
};

async function loadFulfillmentGate(): Promise<FulfillmentGate> {
  try {
    const configuration = await prisma.fulfillmentConfiguration.findUnique({
      where: { id: "default" },
      select: { featureEnabled: true, pickupEnabled: true, doorstepEnabled: true },
    });
    if (!configuration?.featureEnabled) return disabledGate;
    const pickupEnabled = configuration.pickupEnabled;
    return {
      featureEnabled: pickupEnabled || configuration.doorstepEnabled,
      pickupEnabled,
      doorstepEnabled: configuration.doorstepEnabled,
    };
  } catch (error) {
    // During rolling deployments the legacy checkout remains available until
    // the additive fulfillment migration has reached the database.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return disabledGate;
    }
    throw error;
  }
}

type FulfillmentSnapshot = {
  fulfillmentMethod: FulfillmentMethod;
  pickupStationId: string | null;
  pickupStationName: string | null;
  pickupStationAddress: string | null;
  deliveryFee: Prisma.Decimal;
  deliveryFeeStatus: DeliveryFeeStatus;
  deliveryEta: string | null;
  deliveryOrigin: string | null;
  deliveryRateId: string | null;
  address: string;
};

async function resolveFulfillment(
  tx: Prisma.TransactionClient,
  input: CheckoutInput,
  gate: FulfillmentGate,
): Promise<FulfillmentSnapshot> {
  if (!gate.featureEnabled || (!gate.pickupEnabled && !gate.doorstepEnabled)) {
    return {
      fulfillmentMethod: "LEGACY",
      pickupStationId: null,
      pickupStationName: null,
      pickupStationAddress: null,
      deliveryFee: new Prisma.Decimal(0),
      deliveryFeeStatus: "CONFIRMED",
      deliveryEta: null,
      deliveryOrigin: null,
      deliveryRateId: null,
      address: input.address,
    };
  }

  // Re-read inside the order transaction so a method or station cannot be
  // disabled between the public configuration read and order creation.
  const configuration = await tx.fulfillmentConfiguration.findUnique({
    where: { id: "default" },
  });
  if (!configuration?.featureEnabled) {
    throw Errors.conflict("Delivery options changed. Please review your order and try again.");
  }
  if (!input.deliveryMethod) {
    throw Errors.badRequest("Choose pickup station or doorstep delivery.");
  }

  if (input.deliveryMethod === "DOORSTEP") {
    if (!configuration.doorstepEnabled) {
      throw Errors.conflict("Doorstep delivery is no longer available. Choose another method.");
    }
    const destination = input.deliveryDestination;
    const quote = destination
      ? await resolveDeliveryQuote(tx, {
          method: "DOORSTEP",
          destinationCounty: destination.county,
          destinationArea: destination.town,
        })
      : {
          status: "PENDING_QUOTE" as const,
          fee: null,
          estimatedDeliveryTime: null,
          rateId: null,
          origin: null,
        };
    return {
      fulfillmentMethod: "DOORSTEP",
      pickupStationId: null,
      pickupStationName: null,
      pickupStationAddress: null,
      deliveryFee: new Prisma.Decimal(quote.fee ?? 0),
      deliveryFeeStatus: quote.status,
      deliveryEta: quote.estimatedDeliveryTime,
      deliveryOrigin: quote.origin,
      deliveryRateId: quote.rateId,
      address: destination
        ? [destination.address, destination.town, destination.county, destination.country]
            .filter(Boolean)
            .join(", ")
        : input.address,
    };
  }

  if (!configuration.pickupEnabled) {
    throw Errors.conflict("Pickup delivery is no longer available. Choose another method.");
  }
  if (!input.pickupStationId && !input.manualPickupStation) {
    throw Errors.badRequest("Choose a listed pickup station or enter your pickup location.");
  }
  const station = input.pickupStationId
    ? await tx.pickupStation.findFirst({
        where: { id: input.pickupStationId, isActive: true, archivedAt: null },
      })
    : null;
  if (input.pickupStationId && !station) {
    throw Errors.conflict("The selected pickup station is no longer available.");
  }
  const manual = input.manualPickupStation;
  const pickupName = station?.name ?? manual?.name ?? "Requested pickup point";
  const pickupAddress =
    station?.address ??
    (manual
      ? [manual.address, manual.city, manual.region, "Kenya"].filter(Boolean).join(", ")
      : input.address);
  const destinationCounty = station?.region ?? manual?.region ?? "";
  const destinationArea = station?.city ?? manual?.city ?? "";
  const quote = destinationCounty
    ? await resolveDeliveryQuote(tx, {
        method: "PICKUP_STATION",
        destinationCounty,
        destinationArea,
      })
    : {
        status: "PENDING_QUOTE" as const,
        fee: null,
        estimatedDeliveryTime: null,
        rateId: null,
        origin: null,
      };
  return {
    fulfillmentMethod: "PICKUP_STATION",
    pickupStationId: station?.id ?? null,
    pickupStationName: pickupName,
    pickupStationAddress: pickupAddress,
    deliveryFee: new Prisma.Decimal(quote.fee ?? 0),
    deliveryFeeStatus: quote.status,
    deliveryEta: quote.estimatedDeliveryTime,
    deliveryOrigin: quote.origin,
    deliveryRateId: quote.rateId,
    address: pickupAddress,
  };
}

async function serializableTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
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
  includeActorIdentity = false,
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
      include: orderRelations,
    }),
  ]);

  return {
    items: rows.map((r) => toOrderDTO(r as OrderWithItems, { includeActorIdentity })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/** Admin listing — every order, filterable. */
export function adminList(query: OrderQuery): Promise<Paginated<OrderDTO>> {
  return listOrders(query, undefined, true);
}

/** Customer listing — scoped to the authenticated user's own orders. */
export function listForUser(userId: string, query: OrderQuery): Promise<Paginated<OrderDTO>> {
  return listOrders(query, userId);
}

export async function adminGetById(id: string): Promise<OrderDTO> {
  const row = await prisma.order.findUnique({ where: { id }, ...withItems });
  if (!row) throw Errors.notFound("Order not found.");
  return toOrderDTO(row as OrderWithItems, { includeActorIdentity: true });
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
  const fulfillmentGate = await loadFulfillmentGate();
  // Collapse duplicate product+variant lines for order snapshots while keeping
  // stock checks grouped by product because variants share product inventory.
  const cartLines = new Map<
    string,
    { productId: string; variantName: string | null; quantity: number }
  >();
  const quantityByProduct = new Map<string, number>();
  for (const line of input.items) {
    const variantName = line.variantName?.trim() || null;
    const key = `${line.productId}\u0000${variantName ?? ""}`;
    const existing = cartLines.get(key);
    if (existing) {
      existing.quantity += line.quantity;
    } else {
      cartLines.set(key, { productId: line.productId, variantName, quantity: line.quantity });
    }
    quantityByProduct.set(
      line.productId,
      (quantityByProduct.get(line.productId) ?? 0) + line.quantity,
    );
  }
  const productIds = [...quantityByProduct.keys()];
  const guestActor =
    input.anonymousId ??
    `guest:${createHash("sha256").update(input.contactPhone.trim()).digest("hex")}`;

  const order = await serializableTransaction(async (tx) => {
    const fulfillment = await resolveFulfillment(tx, input, fulfillmentGate);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const byId = new Map(products.map((p) => [p.id, p]));
    // Promotions are resolved from their own time-bound layer. Product base/
    // selling prices are never mutated when a campaign starts or expires.
    const effectivePrices = await loadEffectivePrices(tx, products);

    let subtotal = new Prisma.Decimal(0);
    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    const promotionQuantities = new Map<string, number>();
    const revenueByProduct = new Map<string, Prisma.Decimal>();

    for (const [productId, quantity] of quantityByProduct) {
      const product = byId.get(productId);
      if (!product) throw Errors.badRequest("A product in your cart is no longer available.");
      if (!product.isActive) {
        throw Errors.badRequest(`"${product.name}" is no longer available.`);
      }
      if (product.stock < quantity) {
        throw Errors.conflict(`Only ${product.stock} of "${product.name}" left in stock.`);
      }
    }

    for (const line of cartLines.values()) {
      const product = byId.get(line.productId)!;
      const effective = effectivePrices.get(product.id);
      const variants = productVariantsSchema.parse(product.variants ?? []);
      const selectedVariant = line.variantName
        ? variants.find((variant) => variant.name === line.variantName)
        : null;
      if (line.variantName && !selectedVariant) {
        throw Errors.badRequest(
          `"${product.name}" option "${line.variantName}" is no longer available.`,
        );
      }
      const variantHasPrice = selectedVariant?.price != null;
      const unitPrice = variantHasPrice
        ? new Prisma.Decimal(selectedVariant.price!.toString())
        : (effective?.effectivePrice ??
          new Prisma.Decimal((product.sellingPrice ?? product.price).toString()));
      const lineTotal = unitPrice.mul(line.quantity);
      subtotal = subtotal.add(lineTotal);
      revenueByProduct.set(
        product.id,
        (revenueByProduct.get(product.id) ?? new Prisma.Decimal(0)).add(lineTotal),
      );
      if (!variantHasPrice) {
        promotionQuantities.set(
          product.id,
          (promotionQuantities.get(product.id) ?? 0) + line.quantity,
        );
      }

      orderItems.push({
        product: { connect: { id: product.id } },
        productName: selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name,
        unitPrice,
        quantity: line.quantity,
        imageUrl: selectedVariant?.imageUrl ?? product.images[0] ?? null,
      });
    }

    for (const [productId, quantity] of quantityByProduct) {
      const product = byId.get(productId)!;
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

    // Decide how much wallet credit to apply server-side. The amount is capped
    // at the live balance and the item subtotal plus delivery fee.
    const payableBeforeWallet = subtotal.add(fulfillment.deliveryFee);
    let walletApplied = new Prisma.Decimal(0);
    if (userId && input.useWallet) {
      const wallet = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true },
      });
      const balance = new Prisma.Decimal((wallet?.walletBalance ?? 0).toString());
      if (balance.greaterThan(0)) {
        walletApplied = balance.greaterThan(payableBeforeWallet) ? payableBeforeWallet : balance;
      }
    }
    const total = payableBeforeWallet.sub(walletApplied);

    const created = await tx.order.create({
      data: {
        userId: userId ?? null,
        subtotal,
        walletApplied,
        total,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail ?? null,
        address: fulfillment.address,
        note: input.note ?? null,
        fulfillmentMethod: fulfillment.fulfillmentMethod,
        pickupStationId: fulfillment.pickupStationId,
        pickupStationName: fulfillment.pickupStationName,
        pickupStationAddress: fulfillment.pickupStationAddress,
        deliveryFee: fulfillment.deliveryFee,
        deliveryFeeStatus: fulfillment.deliveryFeeStatus,
        deliveryEta: fulfillment.deliveryEta,
        deliveryOrigin: fulfillment.deliveryOrigin,
        deliveryRateId: fulfillment.deliveryRateId,
        items: { create: orderItems },
        statusHistory: {
          create: {
            toStatus: "PENDING",
            actorType: userId ? "CUSTOMER" : "SYSTEM",
            actorId: userId ?? null,
            actorName: input.contactName,
            note: "Order placed",
          },
        },
      },
      include: orderRelations,
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
          revenue: (revenueByProduct.get(productId) ?? new Prisma.Decimal(0)).toString(),
        },
      })),
    });
    if (userId) {
      await tx.wishlistItem.updateMany({
        where: { userId, productId: { in: productIds }, status: "ACTIVE" },
        data: {
          status: "PURCHASED",
          purchasedAt: new Date(),
          remindersEnabled: false,
          reminderVersion: { increment: 1 },
        },
      });
      await tx.retentionTrigger.updateMany({
        where: {
          userId,
          productId: { in: productIds },
          triggerType: "wishlist",
          status: "PENDING",
        },
        data: { status: "SKIPPED", lastError: "Product purchased" },
      });
    }

    // Reserve campaign inventory in the same transaction as stock/order. The
    // conditional counters make promotion limits safe during traffic spikes.
    for (const [productId, quantity] of promotionQuantities) {
      const effective = effectivePrices.get(productId);
      if (!effective?.promotionId || !effective.promotionProductId) continue;
      const campaign = await tx.promotion.findUnique({ where: { id: effective.promotionId } });
      const promotionProduct = await tx.promotionProduct.findUnique({
        where: { id: effective.promotionProductId },
      });
      if (!campaign || !promotionProduct)
        throw Errors.conflict("A promotion changed during checkout. Please retry.");

      const actorWhere = userId ? { userId } : { anonymousId: guestActor };
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
          address:
            fulfillment.fulfillmentMethod === "PICKUP_STATION" || !input.saveAddressAsDefault
              ? undefined
              : fulfillment.address.trim() || undefined,
        },
      });
    }
    // Pay a referrer once their referred user makes their first purchase.
    if (userId) await rewardReferralOnFirstOrder(tx, userId);

    return created;
  });

  return toOrderDTO(order as OrderWithItems, { includeActorIdentity: true });
}

/**
 * Update order status. Entering CANCELLED from a live state restores the stock
 * reserved by the order's line items, atomically with the status write.
 */
export async function updateStatus(
  id: string,
  status: OrderStatus,
  actor: OrderStatusActor = { type: "ADMIN" },
): Promise<OrderDTO> {
  let shouldNotifyPickupReady = false;
  const order = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id },
      include: { items: true, user: { select: { email: true } } },
    });
    if (!current) throw Errors.notFound("Order not found.");
    if (
      current.deliveryFeeStatus === "PENDING_QUOTE" &&
      [
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "AT_PICKUP_STATION",
        "PICKED_UP",
        "DELIVERED",
      ].includes(status)
    ) {
      throw Errors.conflict(
        "Confirm the route-specific delivery quote before progressing this order.",
      );
    }

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
        data: current.items.flatMap((item) =>
          item.productId
            ? [
                {
                  eventId: randomUUID(),
                  eventType: "order_cancelled",
                  userId: current.userId,
                  productId: item.productId,
                  trusted: true,
                  occurredAt: new Date(),
                  source: "order_status",
                  metadata: { orderId: current.id, quantity: item.quantity },
                },
              ]
            : [],
        ),
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

    if (current.status === status) {
      return current;
    }

    const recipient =
      current.contactEmail?.trim().toLowerCase() || current.user?.email.toLowerCase() || null;
    const enteringPickupStation =
      status === "AT_PICKUP_STATION" &&
      current.status !== "AT_PICKUP_STATION" &&
      current.fulfillmentMethod === "PICKUP_STATION";
    shouldNotifyPickupReady = enteringPickupStation;

    return tx.order.update({
      where: { id },
      data: {
        status,
        pickupReadyAt: enteringPickupStation ? new Date() : undefined,
        pickedUpAt: status === "PICKED_UP" ? new Date() : undefined,
        statusHistory: {
          create: {
            fromStatus: current.status,
            toStatus: status,
            actorType: actor.type,
            actorId: actor.id ?? null,
            actorName: actor.name ?? null,
            note: actor.note?.trim() || null,
          },
        },
        ...(enteringPickupStation && recipient
          ? {
              notificationDeliveries: {
                upsert: {
                  where: { orderId_type: { orderId: id, type: "PICKUP_READY" } },
                  create: { type: "PICKUP_READY", recipient },
                  update: { recipient, status: "PENDING", lastError: null },
                },
              },
            }
          : {}),
      },
      include: orderRelations,
    });
  });

  if (shouldNotifyPickupReady) {
    if (order.userId) {
      await prisma.notification
        .create({
          data: {
            recipientType: "USER",
            recipientId: order.userId,
            title: "Your order is ready for pickup",
            body: `Order #${order.orderNumber} has arrived at ${order.pickupStationName ?? "your pickup station"}.`,
            type: "order_update",
            relatedId: order.id,
          },
        })
        .catch((error) =>
          logger.error({ error, orderId: order.id }, "Pickup in-app notification failed"),
        );
    }
    await dispatchPickupReadyEmail(order.id);
    const refreshed = await prisma.order.findUnique({ where: { id: order.id }, ...withItems });
    if (refreshed) return toOrderDTO(refreshed as OrderWithItems, { includeActorIdentity: true });
  }

  return toOrderDTO(order as OrderWithItems, { includeActorIdentity: true });
}

export async function dispatchPickupReadyEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { notificationDeliveries: true },
  });
  const delivery = order?.notificationDeliveries.find((item) => item.type === "PICKUP_READY");
  if (!order || !delivery || delivery.status === "SENT") return;

  await prisma.orderNotificationDelivery.update({
    where: { id: delivery.id },
    data: { attempts: { increment: 1 }, lastError: null },
  });
  try {
    const result = await sendPickupReadyEmail({
      to: delivery.recipient,
      customerName: order.contactName,
      orderNumber: order.orderNumber,
      stationName: order.pickupStationName,
      stationAddress: order.pickupStationAddress,
      readyAt: order.pickupReadyAt ?? new Date(),
    });
    await prisma.orderNotificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "SENT", providerMessageId: result.id, sentAt: new Date(), lastError: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Email delivery failed";
    await prisma.orderNotificationDelivery.update({
      where: { id: delivery.id },
      data: { status: "FAILED", lastError: message },
    });
    logger.error({ error, orderId }, "Pickup-ready email failed");
  }
}

/** Retry a bounded batch from the transactional email outbox. */
export async function retryPendingPickupReadyEmails(limit = 20): Promise<number> {
  const deliveries = await prisma.orderNotificationDelivery.findMany({
    where: {
      type: "PICKUP_READY",
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: 5 },
      updatedAt: { lte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    select: { orderId: true },
    orderBy: { updatedAt: "asc" },
    take: Math.max(1, Math.min(limit, 100)),
  });
  for (const delivery of deliveries) await dispatchPickupReadyEmail(delivery.orderId);
  return deliveries.length;
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
  return updateStatus(order.id, "CANCELLED", {
    type: "CUSTOMER",
    id: userId,
    note: "Cancelled by customer",
  });
}

export async function updatePayment(id: string, paymentStatus: PaymentStatus): Promise<OrderDTO> {
  const current = await prisma.order.findUnique({
    where: { id },
    select: { id: true, deliveryFeeStatus: true },
  });
  if (!current) throw Errors.notFound("Order not found.");
  if (paymentStatus === "PAID" && current.deliveryFeeStatus === "PENDING_QUOTE") {
    throw Errors.conflict(
      "Confirm the route-specific delivery quote before marking this order paid.",
    );
  }

  const order = await prisma.order.update({
    where: { id },
    data: { paymentStatus },
    include: orderRelations,
  });
  return toOrderDTO(order as OrderWithItems, { includeActorIdentity: true });
}

/** Confirm a route-specific doorstep quote and recompute the payable total. */
export async function updateDeliveryQuote(
  id: string,
  input: OrderDeliveryQuoteInput,
): Promise<OrderDTO> {
  const order = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!current) throw Errors.notFound("Order not found.");
    if (current.fulfillmentMethod === "LEGACY") {
      throw Errors.badRequest("This order does not use route-based delivery.");
    }
    if (current.paymentStatus === "PAID") {
      throw Errors.conflict("A paid order's delivery quote cannot be changed.");
    }
    const fee = new Prisma.Decimal(input.deliveryFee);
    const total = new Prisma.Decimal(current.subtotal.toString())
      .add(fee)
      .sub(new Prisma.Decimal(current.walletApplied.toString()));
    return tx.order.update({
      where: { id },
      data: {
        deliveryFee: fee,
        deliveryFeeStatus: "CONFIRMED",
        deliveryEta: input.deliveryEta,
        total,
      },
      include: orderRelations,
    });
  });
  return toOrderDTO(order as OrderWithItems, { includeActorIdentity: true });
}

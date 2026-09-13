import type { Order, OrderItem, OrderNotificationDelivery, OrderStatusHistory } from "@nuru/db";
import type {
  DeliveryFeeStatus,
  FulfillmentMethod,
  OrderDTO,
  OrderItemDTO,
  OrderStatus,
  PaymentStatus,
} from "@nuru/types";

export type OrderWithItems = Order & {
  items: OrderItem[];
  statusHistory?: OrderStatusHistory[];
  notificationDeliveries?: OrderNotificationDelivery[];
};

const toIso = (d: Date): string => d.toISOString();

/**
 * Multiply a 2-decimal money value by an integer quantity without float drift,
 * by routing through integer cents. Only `.toString()` is required from the
 * input, so this works on a real Prisma Decimal or any string-like stand-in.
 */
function lineTotal(unitPrice: { toString(): string }, quantity: number): string {
  const cents = Math.round(Number(unitPrice.toString()) * 100) * quantity;
  return (cents / 100).toFixed(2);
}

export function toOrderItemDTO(i: OrderItem): OrderItemDTO {
  return {
    id: i.id,
    productId: i.productId,
    productName: i.productName,
    unitPrice: i.unitPrice.toString(),
    quantity: i.quantity,
    imageUrl: i.imageUrl,
    lineTotal: lineTotal(i.unitPrice, i.quantity),
  };
}

export function toOrderDTO(
  o: OrderWithItems,
  options: { includeActorIdentity?: boolean } = {},
): OrderDTO {
  const items = o.items.map(toOrderItemDTO);
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    userId: o.userId,
    status: o.status as OrderStatus,
    paymentStatus: o.paymentStatus as PaymentStatus,
    subtotal: o.subtotal.toString(),
    walletApplied: o.walletApplied.toString(),
    total: o.total.toString(),
    contactName: o.contactName,
    contactPhone: o.contactPhone,
    contactEmail: o.contactEmail,
    address: o.address,
    note: o.note,
    fulfillmentMethod: (o.fulfillmentMethod ?? "LEGACY") as FulfillmentMethod,
    pickupStationId: o.pickupStationId ?? null,
    pickupStationName: o.pickupStationName ?? null,
    pickupStationAddress: o.pickupStationAddress ?? null,
    deliveryFee: o.deliveryFee?.toString() ?? "0.00",
    deliveryFeeStatus: (o.deliveryFeeStatus ?? "CONFIRMED") as DeliveryFeeStatus,
    deliveryEta: o.deliveryEta ?? null,
    deliveryOrigin: o.deliveryOrigin ?? null,
    deliveryRateId: o.deliveryRateId ?? null,
    pickupReadyAt: o.pickupReadyAt?.toISOString() ?? null,
    pickedUpAt: o.pickedUpAt?.toISOString() ?? null,
    pickupReadyEmailStatus:
      (o.notificationDeliveries?.find((delivery) => delivery.type === "PICKUP_READY")?.status as
        "PENDING" | "SENT" | "FAILED" | undefined) ?? null,
    statusHistory: (o.statusHistory ?? []).map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus as OrderStatus | null,
      toStatus: event.toStatus as OrderStatus,
      actorType: event.actorType,
      actorName: options.includeActorIdentity
        ? event.actorName
        : event.actorType === "CUSTOMER"
          ? "Customer"
          : event.actorType === "PICKUP_AGENT"
            ? "Pickup station"
            : "NuruShop team",
      note: event.note,
      createdAt: toIso(event.createdAt),
    })),
    items,
    itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
    createdAt: toIso(o.createdAt),
    updatedAt: toIso(o.updatedAt),
  };
}

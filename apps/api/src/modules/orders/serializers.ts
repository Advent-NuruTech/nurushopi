import type { Order, OrderItem } from "@nuru/db";
import type { OrderDTO, OrderItemDTO, OrderStatus, PaymentStatus } from "@nuru/types";

export type OrderWithItems = Order & { items: OrderItem[] };

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

export function toOrderDTO(o: OrderWithItems): OrderDTO {
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
    items,
    itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
    createdAt: toIso(o.createdAt),
    updatedAt: toIso(o.updatedAt),
  };
}

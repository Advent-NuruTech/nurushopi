// app/profile/utils/typeAdapter.ts
import type { OrderDTO } from "@nuru/types";
import type { ApiOrder } from "../types";

/**
 * Maps the API's `OrderDTO` (uppercase status, string money, snapshot line items)
 * onto the lowercase `ApiOrder` shape the profile/order components were written
 * against. Keeping the mapping here means the presentational components stay
 * untouched while the data source moved from Firestore to the Express API.
 */
const ORDER_STATUS_MAP: Record<OrderDTO["status"], ApiOrder["status"]> = {
  PENDING: "pending",
  CONFIRMED: "pending",
  PROCESSING: "pending",
  SHIPPED: "shipped",
  DELIVERED: "received",
  CANCELLED: "cancelled",
  REFUNDED: "cancelled",
};

export function adaptOrder(dto: OrderDTO): ApiOrder {
  return {
    id: dto.id,
    // `orderNumber` is what the customer cancel endpoint keys on; stash it so the
    // detail modal can call it without another lookup.
    orderNumber: dto.orderNumber,
    name: dto.contactName ?? "",
    phone: dto.contactPhone ?? "",
    email: dto.contactEmail,
    country: "",
    county: "",
    locality: dto.address ?? "",
    items: dto.items.map((it) => ({
      id: it.id,
      productId: it.productId ?? undefined,
      name: it.productName,
      price: Number(it.unitPrice),
      quantity: it.quantity,
      image: it.imageUrl ?? undefined,
    })),
    totalAmount: Number(dto.total),
    status: ORDER_STATUS_MAP[dto.status] ?? "pending",
    cancellationReason: null,
    createdAt: dto.createdAt,
  };
}

export type ContextAppUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  imageUrl?: string | null;
};

export type LocalAppUser = {
  id?: string;
  name?: string;
  email?: string;
  imageUrl?: string;
};

export const adaptAppUser = (contextUser: ContextAppUser | null): LocalAppUser | null => {
  if (!contextUser) return null;
  
  return {
    id: contextUser.id,
    name: contextUser.name ?? undefined,
    email: contextUser.email ?? undefined,
    imageUrl: contextUser.imageUrl ?? undefined,
  };
};
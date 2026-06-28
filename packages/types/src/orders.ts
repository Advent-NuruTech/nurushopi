import { z } from "zod";
import { emailSchema } from "./auth.js";
import { paginationQuerySchema } from "./catalog.js";

// ---------------------------------------------------------------------------
// Orders & checkout
//
// An order is created from a cart of product references. Prices are NEVER
// trusted from the client — checkout re-reads each product server-side and
// snapshots the live price/name/image into immutable order line items so that
// order history survives later product edits or deletions.
//
// Money is carried as a string in DTOs to avoid float precision loss, mirroring
// the catalog/wholesale contracts. Wallet credit can be applied at checkout via
// `useWallet`: the wallet module owns the ledger + atomic balance deduction, and
// checkout decides the applied amount server-side (never trusted from the client).
// ---------------------------------------------------------------------------

/** Order lifecycle states. Mirrors the Prisma `OrderStatus` enum. */
export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Payment states. Mirrors the Prisma `PaymentStatus` enum. */
export const PAYMENT_STATUSES = ["UNPAID", "PAID", "REFUNDED", "FAILED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** A single line in a checkout request: a product reference + quantity. */
export const checkoutItemSchema = z
  .object({
    productId: z.string().cuid("Invalid product reference."),
    quantity: z.coerce
      .number({ invalid_type_error: "Quantity must be a number." })
      .int("Quantity must be a whole number.")
      .min(1, "Quantity must be at least 1.")
      .max(1000, "Quantity is too large."),
  })
  .strict();
export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;

/** Full checkout payload: cart lines plus contact / delivery snapshot. */
export const checkoutSchema = z
  .object({
    items: z
      .array(checkoutItemSchema)
      .min(1, "Your cart is empty.")
      .max(100, "Too many items in one order."),
    contactName: z.string().trim().min(1, "Name is required.").max(120),
    contactPhone: z.string().trim().min(1, "Phone is required.").max(32),
    contactEmail: emailSchema.optional().nullable(),
    address: z.string().trim().min(1, "Delivery address is required.").max(500),
    note: z.string().trim().max(1000).optional().nullable(),
    // Opt-in to spending wallet credit on this order. The amount applied is
    // decided server-side (min of live balance and subtotal) — never trusted
    // from the client — and only takes effect for an authenticated user.
    useWallet: z.coerce.boolean().optional().default(false),
  })
  .strict();
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const orderSortSchema = z
  .enum(["newest", "oldest", "total_asc", "total_desc"])
  .default("newest");
export type OrderSort = z.infer<typeof orderSortSchema>;

/** Admin/customer order listing filters (merged with pagination). */
export const orderQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
  userId: z.string().cuid().optional(),
  sort: orderSortSchema,
});
export type OrderQuery = z.infer<typeof orderQuerySchema>;

/** Admin status transition payload. */
export const orderStatusUpdateSchema = z
  .object({ status: z.enum(ORDER_STATUSES) })
  .strict();
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;

/** Admin payment-status transition payload. */
export const orderPaymentUpdateSchema = z
  .object({ paymentStatus: z.enum(PAYMENT_STATUSES) })
  .strict();
export type OrderPaymentUpdateInput = z.infer<typeof orderPaymentUpdateSchema>;

export interface OrderItemDTO {
  id: string;
  productId: string | null;
  productName: string;
  /** Decimal serialised as a string to avoid float precision loss. */
  unitPrice: string;
  quantity: number;
  imageUrl: string | null;
  /** unitPrice × quantity, computed server-side. */
  lineTotal: string;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  userId: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: string;
  walletApplied: string;
  total: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  note: string | null;
  items: OrderItemDTO[];
  /** Sum of line quantities. */
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

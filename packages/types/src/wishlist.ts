import { z } from "zod";
import { idSchema, paginationQuerySchema, type ProductDTO } from "./catalog.js";

export const WISHLIST_STATUSES = ["ACTIVE", "PURCHASED", "REMOVED"] as const;
export type WishlistStatus = (typeof WISHLIST_STATUSES)[number];

export const wishlistUpsertSchema = z
  .object({
    productId: idSchema,
    plannedPurchaseAt: z.coerce.date().optional().nullable(),
    remindersEnabled: z.coerce.boolean().default(false),
    reminderTimezone: z.string().trim().min(1).max(80).optional().nullable(),
  })
  .strict()
  .refine((value) => !value.remindersEnabled || value.plannedPurchaseAt != null, {
    message: "Choose a planned purchase date to enable reminders.",
    path: ["plannedPurchaseAt"],
  });
export type WishlistUpsertInput = z.infer<typeof wishlistUpsertSchema>;

export const wishlistQuerySchema = paginationQuerySchema.extend({
  status: z.enum(WISHLIST_STATUSES).default("ACTIVE"),
});
export type WishlistQuery = z.infer<typeof wishlistQuerySchema>;

export interface WishlistItemDTO {
  id: string;
  userId: string;
  productId: string;
  status: WishlistStatus;
  plannedPurchaseAt: string | null;
  remindersEnabled: boolean;
  reminderTimezone: string | null;
  preReminderSentAt: string | null;
  followupReminderSentAt: string | null;
  purchasedAt: string | null;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
  product: ProductDTO;
}

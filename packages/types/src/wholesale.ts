import { z } from "zod";
import { moneySchema, paginationQuerySchema, slugSchema } from "./catalog.js";

// ---------------------------------------------------------------------------
// Wholesale items
//
// A wholesale item is a bulk SKU sold at a per-unit price with a minimum
// order quantity. Money is carried as a string in the DTO to avoid float loss,
// mirroring the catalog product contract.
// ---------------------------------------------------------------------------

export const wholesaleItemCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(200),
    slug: slugSchema.optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    unitPrice: moneySchema,
    minQuantity: z.coerce
      .number({ invalid_type_error: "Minimum quantity must be a number." })
      .int("Minimum quantity must be a whole number.")
      .min(1, "Minimum quantity must be at least 1.")
      .max(1_000_000, "Minimum quantity is too large.")
      .default(1),
    images: z.array(z.string().url("Each image must be a valid URL.")).max(3).default([]),
    isActive: z.coerce.boolean().default(true),
  })
  .strict();
export type WholesaleItemCreateInput = z.infer<typeof wholesaleItemCreateSchema>;

export const wholesaleItemUpdateSchema = wholesaleItemCreateSchema.partial();
export type WholesaleItemUpdateInput = z.infer<typeof wholesaleItemUpdateSchema>;

export const wholesaleSortSchema = z
  .enum(["newest", "oldest", "price_asc", "price_desc", "name"])
  .default("newest");
export type WholesaleSort = z.infer<typeof wholesaleSortSchema>;

/** Wholesale listing filters (merged with pagination). */
export const wholesaleItemQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  isActive: z.coerce.boolean().optional(),
  minPrice: moneySchema.optional(),
  maxPrice: moneySchema.optional(),
  minQuantity: z.coerce.number().int().min(1).optional(),
  sort: wholesaleSortSchema,
});
export type WholesaleItemQuery = z.infer<typeof wholesaleItemQuerySchema>;

export interface WholesaleItemDTO {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  /** Decimal serialised as a string to avoid float precision loss. */
  unitPrice: string;
  minQuantity: number;
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

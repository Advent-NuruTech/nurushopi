import { z } from "zod";
import { collectionKeySchema } from "./merchandising";
import { idSchema, moneySchema } from "./catalog";
import { productVariantsSchema } from "./variants";

const importSkuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2)
  .max(80)
  .regex(/^[A-Z0-9][A-Z0-9._-]*$/, "Invalid SKU format.");

export const productImportRowSchema = z
  .object({
    rowKey: z.string().trim().max(80).optional(),
    channel: z.enum(["retail", "wholesale", "both"]).default("retail"),
    name: z.string().trim().min(1).max(200),
    sku: importSkuSchema,
    price: moneySchema.optional().nullable(),
    wholesalePrice: moneySchema.optional().nullable(),
    minQuantity: z.coerce.number().int().positive().max(1_000_000).default(1),
    stock: z.coerce.number().int().min(0).default(0),
    lowStockThreshold: z.coerce.number().int().min(0).max(10_000).default(5),
    categoryId: idSchema.optional().nullable(),
    brandName: z.string().trim().max(120).optional().nullable(),
    storeName: z.string().trim().max(160).optional().nullable(),
    description: z.string().trim().max(5000).optional().nullable(),
    images: z.array(z.string().url()).max(3).default([]),
    variants: productVariantsSchema.optional(),
    collectionKeys: z.array(collectionKeySchema).max(25).default([]),
    isActive: z.coerce.boolean().default(true),
  })
  .superRefine((row, ctx) => {
    if ((row.channel === "retail" || row.channel === "both") && row.price == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Retail price is required for retail products.",
      });
    }
    if ((row.channel === "wholesale" || row.channel === "both") && row.wholesalePrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["wholesalePrice"],
        message: "Wholesale price is required for wholesale products.",
      });
    }
    if (row.channel === "wholesale" && row.collectionKeys.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["collectionKeys"],
        message:
          "Retail collections accept retail products. Wholesale products automatically enter wholesale discovery.",
      });
    }
  });

export const productImportSchema = z.object({
  rows: z.array(productImportRowSchema).min(1).max(250),
  duplicateStrategy: z.enum(["update", "skip", "error"]).default("update"),
});

/** Envelope used by the API so invalid rows can be reported without rejecting valid siblings. */
export const productImportEnvelopeSchema = z.object({
  rows: z.array(z.unknown()).min(1).max(250),
  duplicateStrategy: z.enum(["update", "skip", "error"]).default("update"),
});

export type ProductImportInput = z.infer<typeof productImportSchema>;
export type ProductImportEnvelopeInput = z.infer<typeof productImportEnvelopeSchema>;

export interface ProductImportRowResult {
  row: number;
  rowKey: string | null;
  sku: string;
  status: "created" | "updated" | "skipped" | "failed";
  retailProductId: string | null;
  wholesaleItemId: string | null;
  collectionsAdded: string[];
  error: string | null;
}

export interface ProductImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  results: ProductImportRowResult[];
}

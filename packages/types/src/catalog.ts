import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** URL-safe slug: lowercase alphanumerics separated by single hyphens. */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may only contain lowercase letters, numbers and hyphens.");

/** Non-negative money amount accepted as a number or numeric string. */
export const moneySchema = z.coerce
  .number({ invalid_type_error: "Must be a number." })
  .nonnegative("Must be zero or greater.")
  .max(99_999_999, "Amount is too large.");

/** Cursor-less page/pageSize pagination shared by every list endpoint. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Standard paginated envelope returned by list endpoints. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  slug: slugSchema.optional(),
  icon: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = categoryCreateSchema.partial();
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  sortOrder: number;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const productCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(200),
    slug: slugSchema.optional(),
    description: z.string().trim().max(5000).optional().nullable(),
    shortDescription: z.string().trim().max(300).optional().nullable(),
    price: moneySchema,
    originalPrice: moneySchema.optional().nullable(),
    sellingPrice: moneySchema.optional().nullable(),
    images: z.array(z.string().url("Each image must be a valid URL.")).max(3).default([]),
    stock: z.coerce.number().int().min(0).default(0),
    isActive: z.coerce.boolean().default(true),
    isFeatured: z.coerce.boolean().default(false),
    categoryId: z.string().cuid().optional().nullable(),
  })
  .strict();
export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema.partial();
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const productSortSchema = z
  .enum(["newest", "oldest", "price_asc", "price_desc", "name"])
  .default("newest");
export type ProductSort = z.infer<typeof productSortSchema>;

/** Public product listing filters (merged with pagination). */
export const productQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  categoryId: z.string().cuid().optional(),
  categorySlug: slugSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  minPrice: moneySchema.optional(),
  maxPrice: moneySchema.optional(),
  inStock: z.coerce.boolean().optional(),
  sort: productSortSchema,
});
export type ProductQuery = z.infer<typeof productQuerySchema>;

export interface ProductDTO {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  shortDescription: string | null;
  /** Decimal serialised as a string to avoid float precision loss. */
  price: string;
  originalPrice: string | null;
  sellingPrice: string | null;
  images: string[];
  stock: number;
  inStock: boolean;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string | null;
  category: Pick<CategoryDTO, "id" | "name" | "slug"> | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

export const bannerCreateSchema = z.object({
  title: z.string().trim().max(160).optional().nullable(),
  subtitle: z.string().trim().max(300).optional().nullable(),
  imageUrl: z.string().url("Image URL must be valid."),
  linkUrl: z.string().url("Link URL must be valid.").optional().nullable(),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});
export type BannerCreateInput = z.infer<typeof bannerCreateSchema>;

export const bannerUpdateSchema = bannerCreateSchema.partial();
export type BannerUpdateInput = z.infer<typeof bannerUpdateSchema>;

export interface BannerDTO {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Hero announcements
// ---------------------------------------------------------------------------

/** CSS gradient token rendered behind a marquee slide (free-form, capped). */
const heroGradientSchema = z.string().trim().min(1).max(120);
/** Sort position in the marquee; lower shows first. */
const heroOrderSchema = z.coerce.number().int().min(0).max(100_000);

export const heroCreateSchema = z
  .object({
    message: z.string().trim().min(1, "Message is required.").max(280),
    linkUrl: z.string().url("Link URL must be valid.").optional().nullable(),
    gradient: heroGradientSchema.optional().nullable(),
    order: heroOrderSchema.default(0),
    isActive: z.coerce.boolean().default(true),
    startsAt: z.coerce.date().optional().nullable(),
    endsAt: z.coerce.date().optional().nullable(),
  })
  .refine((v) => !v.startsAt || !v.endsAt || v.endsAt >= v.startsAt, {
    message: "endsAt must be after startsAt.",
    path: ["endsAt"],
  });
export type HeroCreateInput = z.infer<typeof heroCreateSchema>;

export const heroUpdateSchema = z
  .object({
    message: z.string().trim().min(1).max(280).optional(),
    linkUrl: z.string().url().optional().nullable(),
    gradient: heroGradientSchema.optional().nullable(),
    order: heroOrderSchema.optional(),
    isActive: z.coerce.boolean().optional(),
    startsAt: z.coerce.date().optional().nullable(),
    endsAt: z.coerce.date().optional().nullable(),
  })
  .refine((v) => !v.startsAt || !v.endsAt || v.endsAt >= v.startsAt, {
    message: "endsAt must be after startsAt.",
    path: ["endsAt"],
  });
export type HeroUpdateInput = z.infer<typeof heroUpdateSchema>;

export interface HeroAnnouncementDTO {
  id: string;
  message: string;
  linkUrl: string | null;
  gradient: string | null;
  order: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

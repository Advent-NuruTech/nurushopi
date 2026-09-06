import { z } from "zod";
import { idSchema, moneySchema, type ProductDTO } from "./catalog";

const nullableDate = z.coerce.date().optional().nullable();
const jsonObject = z.record(z.unknown()).optional().nullable();
const merchandisingStatus = z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "ARCHIVED"]);

export const COLLECTION_KEYS = {
  flashSale: "flash_sale",
  newArrivals: "new_arrivals",
  bestSellers: "best_sellers",
  spotlight: "spotlight",
  bundles: "bundles",
  trending: "trending",
} as const;

export const collectionKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Use lowercase letters, numbers and underscores.");

const collectionFields = z.object({
    key: collectionKeySchema,
    displayName: z.string().trim().min(1).max(160),
    shortName: z.string().trim().max(80).optional().nullable(),
    description: z.string().trim().max(2000).optional().nullable(),
    collectionType: z.string().trim().min(1).max(80).default("generic"),
    selectionStrategy: z.string().trim().min(1).max(80).default("hybrid"),
    status: merchandisingStatus.default("DRAFT"),
    priority: z.coerce.number().int().min(-100_000).max(100_000).default(0),
    placement: z.string().trim().max(120).optional().nullable(),
    startAt: nullableDate,
    endAt: nullableDate,
    maxProducts: z.coerce.number().int().min(1).max(1000).default(24),
    sortStrategy: z.string().trim().min(1).max(80).default("rank"),
    eligibilityRules: jsonObject,
    configuration: jsonObject,
    imageUrl: z.string().url().optional().nullable(),
    icon: z.string().trim().max(120).optional().nullable(),
    badgeText: z.string().trim().max(80).optional().nullable(),
    ctaText: z.string().trim().max(80).optional().nullable(),
    ctaUrl: z.string().trim().max(500).optional().nullable(),
    isPersonalized: z.coerce.boolean().default(false),
    isSponsored: z.coerce.boolean().default(false),
  });

export const collectionCreateSchema = collectionFields
  .refine((v) => !v.startAt || !v.endAt || v.endAt > v.startAt, {
    message: "endAt must be after startAt.",
    path: ["endAt"],
  });
export type CollectionCreateInput = z.infer<typeof collectionCreateSchema>;

// The immutable key is intentionally absent. Renaming presentation can never
// break API routes, analytics joins, promotion rules or historical reports.
export const collectionUpdateSchema = collectionFields.omit({ key: true }).partial();
export type CollectionUpdateInput = z.infer<typeof collectionUpdateSchema>;

export const collectionMembershipSchema = z.object({
  productId: idSchema,
  source: z.enum(["AUTOMATIC", "MANUAL", "ALGORITHM", "PROMOTION", "RECOMMENDATION", "SPONSORED"]).default("MANUAL"),
  score: z.coerce.number().finite().default(0),
  rank: z.coerce.number().int().positive().optional().nullable(),
  startsAt: nullableDate,
  expiresAt: nullableDate,
  metadata: jsonObject,
});
export type CollectionMembershipInput = z.infer<typeof collectionMembershipSchema>;

export const collectionOverrideSchema = z.object({
  productId: idSchema,
  type: z.enum(["PIN", "EXCLUDE", "BOOST", "LOWER"]),
  value: z.coerce.number().finite().default(0),
  reason: z.string().trim().max(500).optional().nullable(),
  startsAt: nullableDate,
  expiresAt: nullableDate,
});
export type CollectionOverrideInput = z.infer<typeof collectionOverrideSchema>;

const homepageSectionFields = z.object({
    collectionId: idSchema,
    position: z.coerce.number().int().min(0).max(10_000),
    status: merchandisingStatus.default("DRAFT"),
    audience: jsonObject,
    device: z.enum(["all", "desktop", "mobile"]).default("all"),
    startAt: nullableDate,
    endAt: nullableDate,
    configuration: jsonObject,
    experimentKey: collectionKeySchema.optional().nullable(),
  });

export const homepageSectionCreateSchema = homepageSectionFields
  .refine((v) => !v.startAt || !v.endAt || v.endAt > v.startAt, {
    message: "endAt must be after startAt.",
    path: ["endAt"],
  });
export const homepageSectionUpdateSchema = homepageSectionFields.partial();
export type HomepageSectionCreateInput = z.infer<typeof homepageSectionCreateSchema>;
export type HomepageSectionUpdateInput = z.infer<typeof homepageSectionUpdateSchema>;

export const collectionProductsQuerySchema = z.object({
  cursor: z.string().trim().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  category: z.string().trim().max(140).optional(),
  minPrice: moneySchema.optional(),
  maxPrice: moneySchema.optional(),
  inStock: z.coerce.boolean().default(true),
  segment: z.string().trim().max(80).default("global"),
});
export type CollectionProductsQuery = z.infer<typeof collectionProductsQuerySchema>;

export const commerceEventTypeSchema = z.enum([
  "product_impression",
  "product_view",
  "search_result_impression",
  "search_click",
  "collection_impression",
  "collection_click",
  "add_to_cart",
  "remove_from_cart",
  "wishlist_add",
  "checkout_started",
  "purchase_completed",
  "order_cancelled",
  "product_returned",
  "promotion_impression",
  "promotion_click",
]);

export const commerceEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: commerceEventTypeSchema,
  anonymousId: z.string().trim().min(8).max(191).optional().nullable(),
  sessionId: z.string().trim().min(8).max(191).optional().nullable(),
  productId: idSchema.optional().nullable(),
  sellerId: idSchema.optional().nullable(),
  collectionId: idSchema.optional().nullable(),
  searchQueryId: z.string().trim().max(191).optional().nullable(),
  recommendationId: z.string().trim().max(191).optional().nullable(),
  experimentKey: collectionKeySchema.optional().nullable(),
  variantKey: collectionKeySchema.optional().nullable(),
  position: z.coerce.number().int().min(0).max(100_000).optional().nullable(),
  source: z.string().trim().max(120).optional().nullable(),
  device: z.string().trim().max(80).optional().nullable(),
  timestamp: z.coerce.date(),
  metadata: jsonObject,
});
export const commerceEventBatchSchema = z.object({
  events: z.array(commerceEventSchema).min(1).max(100),
});
export type CommerceEventInput = z.infer<typeof commerceEventSchema>;

export interface MerchandisingCollectionDTO {
  id: string;
  key: string;
  displayName: string;
  shortName: string | null;
  description: string | null;
  collectionType: string;
  selectionStrategy: string;
  status: z.infer<typeof merchandisingStatus>;
  priority: number;
  placement: string | null;
  startAt: string | null;
  endAt: string | null;
  maxProducts: number;
  sortStrategy: string;
  eligibilityRules: unknown;
  configuration: unknown;
  imageUrl: string | null;
  icon: string | null;
  badgeText: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  isPersonalized: boolean;
  isSponsored: boolean;
  cacheVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface MerchandisingProductDTO extends ProductDTO {
  effectivePrice: string;
  basePrice: string;
  promotionId: string | null;
  promotionEndsAt: string | null;
  rankingScore: number;
  rank: number;
  rankingSource: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface HomepageSectionDTO {
  id: string;
  position: number;
  device: string;
  configuration: unknown;
  collection: MerchandisingCollectionDTO;
  products: MerchandisingProductDTO[];
  nextCursor: string | null;
}

export interface HomepageDTO {
  generatedAt: string;
  personalization: "user" | "segment" | "global" | "fallback";
  experimentAssignments: Record<string, string>;
  sections: HomepageSectionDTO[];
}

export const promotionCreateSchema = z
  .object({
    key: collectionKeySchema,
    name: z.string().trim().min(1).max(160),
    status: merchandisingStatus.default("DRAFT"),
    discountType: z.enum(["FIXED_PRICE", "PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: moneySchema,
    fundingType: z.enum(["SELLER", "PLATFORM", "SHARED"]).default("PLATFORM"),
    sellerFundingPct: z.coerce.number().min(0).max(100).optional().nullable(),
    collectionId: idSchema.optional().nullable(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    inventoryLimit: z.coerce.number().int().positive().optional().nullable(),
    perCustomerLimit: z.coerce.number().int().positive().optional().nullable(),
    configuration: jsonObject,
    products: z.array(z.object({
      productId: idSchema,
      promotionalPrice: moneySchema.optional().nullable(),
      inventoryLimit: z.coerce.number().int().positive().optional().nullable(),
      perCustomerLimit: z.coerce.number().int().positive().optional().nullable(),
    })).min(1).max(1000),
  })
  .refine((v) => v.endsAt > v.startsAt, { message: "endsAt must be after startsAt.", path: ["endsAt"] });
export type PromotionCreateInput = z.infer<typeof promotionCreateSchema>;

export const bundleQuoteSchema = z.object({
  bundleId: idSchema,
  productIds: z.array(idSchema).min(1).max(20),
});
export type BundleQuoteInput = z.infer<typeof bundleQuoteSchema>;

export const notificationPreferenceSchema = z.object({
  channel: z.enum(["in_app", "email", "sms", "push"]),
  topic: z.enum(["back_in_stock", "price_drop", "wishlist", "cart_recovery", "new_discovery", "reorder"]),
  enabled: z.boolean(),
  maxPerDay: z.coerce.number().int().min(0).max(20).default(2),
  maxPerWeek: z.coerce.number().int().min(0).max(50).default(5),
  quietHours: jsonObject,
});
export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;

export const retentionSubscriptionSchema = z.object({
  productId: idSchema,
  subscriptionType: z.enum(["back_in_stock", "price_drop", "wishlist"]),
});
export type RetentionSubscriptionInput = z.infer<typeof retentionSubscriptionSchema>;

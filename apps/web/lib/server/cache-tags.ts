/**
 * Central registry of Next.js Data Cache tags for the public storefront.
 *
 * Storefront reads are tagged here; admin writes (or an API webhook) call
 * `POST /api/revalidate` with the matching tag(s) to purge instantly instead
 * of waiting for time-based revalidation. Keeping every tag in one place makes
 * the cache contract explicit and prevents typos between readers and purgers.
 */
export const CacheTags = {
  /** Collection-level tags (purge when any item in the set changes). */
  products: "products",
  categories: "categories",
  banners: "banners",
  hero: "hero",
  wholesale: "wholesale",

  /** Entity-level tags (purge a single detail page). */
  product: (idOrSlug: string) => `product:${idOrSlug}`,
  wholesaleItem: (idOrSlug: string) => `wholesale:${idOrSlug}`,
  banner: (id: string) => `banner:${id}`,
} as const;

/** Every collection tag that can be purged via the revalidate webhook. */
export const REVALIDATABLE_TAGS = [
  CacheTags.products,
  CacheTags.categories,
  CacheTags.banners,
  CacheTags.hero,
  CacheTags.wholesale,
] as const;

export type RevalidatableTag = (typeof REVALIDATABLE_TAGS)[number];

/** Freshness windows (seconds) by content volatility. */
export const Revalidate = {
  /** Frequently-changing collections (stock, listings). */
  short: 60,
  /** Default for catalog reads. */
  default: 300,
  /** Rarely-changing content (legal/marketing copy). */
  long: 3600,
} as const;

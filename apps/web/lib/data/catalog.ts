import "server-only";

import type {
  BannerDTO,
  CategoryDTO,
  HeroAnnouncementDTO,
  Paginated,
  ProductDTO,
} from "@nuru/types";

import { apiGet, buildQuery, ApiError } from "@/lib/server/http";
import { CacheTags, Revalidate } from "@/lib/server/cache-tags";
import {
  toBannerVM,
  toProductCardVM,
  toProductDetailVM,
  type BannerVM,
  type ProductCardVM,
  type ProductDetailVM,
} from "@/lib/view/catalog";

/**
 * Server-side catalog data access for the public storefront.
 *
 * Every function returns render-ready view models (not raw DTOs) and is cached
 * via Next's Data Cache with explicit tags, so the storefront serves from cache
 * and a single `revalidateTag` purges all pages that depend on the data.
 */

export type ProductSort = "newest" | "oldest" | "price_asc" | "price_desc" | "name" | "most_viewed_today";

export interface ListProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categorySlug?: string;
  isFeatured?: boolean;
  inStock?: boolean;
  sort?: ProductSort;
}

export interface ProductListResult {
  items: ProductCardVM[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function listProducts(
  params: ListProductsParams = {},
): Promise<ProductListResult> {
  const query = buildQuery({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    categorySlug: params.categorySlug,
    isFeatured: params.isFeatured,
    inStock: params.inStock,
    sort: params.sort,
  });

  const data = await apiGet<Paginated<ProductDTO>>(`/catalog/products${query}`, {
    tags: [CacheTags.products],
    revalidate: Revalidate.short,
  });

  return {
    items: data.items.map(toProductCardVM),
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    totalPages: data.totalPages,
  };
}

/** Newest active products, optionally limited to those within the "new" window. */
export async function listNewArrivals(limit = 12): Promise<ProductCardVM[]> {
  const { items } = await listProducts({ sort: "newest", pageSize: Math.min(limit * 2, 48) });
  const fresh = items.filter((p) => p.isNew);
  return (fresh.length > 0 ? fresh : items).slice(0, limit);
}

export async function listFeaturedProducts(limit = 12): Promise<ProductCardVM[]> {
  const { items } = await listProducts({ isFeatured: true, pageSize: limit });
  return items;
}

/** A single product by id or slug. Returns `null` on a 404. */
export async function getProduct(idOrSlug: string): Promise<ProductDetailVM | null> {
  try {
    const { product } = await apiGet<{ product: ProductDTO }>(
      `/catalog/products/${encodeURIComponent(idOrSlug)}`,
      { tags: [CacheTags.products, CacheTags.product(idOrSlug)], revalidate: Revalidate.default },
    );
    return toProductDetailVM(product);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return null;
    throw err;
  }
}

/** Up to `limit` products in the same category, excluding `excludeId`. */
export async function getRelatedProducts(
  categorySlug: string | null,
  excludeId: string,
  limit = 4,
): Promise<ProductCardVM[]> {
  if (!categorySlug) return [];
  const { items } = await listProducts({ categorySlug, pageSize: limit + 1 });
  return items.filter((p) => p.id !== excludeId).slice(0, limit);
}

export interface CategoryVM {
  id: string;
  name: string;
  slug: string;
  productCount?: number;
}

export async function listCategories(withCounts = false): Promise<CategoryVM[]> {
  const { categories } = await apiGet<{ categories: CategoryDTO[] }>(
    `/catalog/categories${withCounts ? "?withCounts=true" : ""}`,
    { tags: [CacheTags.categories], revalidate: Revalidate.default },
  );
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: c.productCount,
  }));
}

export async function listBanners(): Promise<BannerVM[]> {
  const { banners } = await apiGet<{ banners: BannerDTO[] }>("/catalog/banners", {
    tags: [CacheTags.banners],
    revalidate: Revalidate.default,
  });
  return banners.map(toBannerVM);
}

export async function getBanner(id: string): Promise<BannerVM | null> {
  const banners = await listBanners();
  return banners.find((b) => b.id === id) ?? null;
}

export async function listHeroAnnouncements(): Promise<HeroAnnouncementDTO[]> {
  const { announcements } = await apiGet<{ announcements: HeroAnnouncementDTO[] }>(
    "/catalog/hero",
    { tags: [CacheTags.hero], revalidate: Revalidate.default },
  );
  return announcements;
}

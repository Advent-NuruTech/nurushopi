import "server-only";

import type { Paginated, WholesaleItemDTO } from "@nuru/types";

import { apiGet, buildQuery, ApiError } from "@/lib/server/http";
import { CacheTags, Revalidate } from "@/lib/server/cache-tags";
import { toWholesaleCardVM, type WholesaleCardVM } from "@/lib/view/catalog";

/** Server-side wholesale data access for the public storefront. */

export type WholesaleSort = "newest" | "oldest" | "price_asc" | "price_desc" | "name";

export interface ListWholesaleParams {
  page?: number;
  pageSize?: number;
  search?: string;
  minQuantity?: number;
  sort?: WholesaleSort;
}

export interface WholesaleListResult {
  items: WholesaleCardVM[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function listWholesaleItems(
  params: ListWholesaleParams = {},
): Promise<WholesaleListResult> {
  const query = buildQuery({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    minQuantity: params.minQuantity,
    sort: params.sort,
  });

  const data = await apiGet<Paginated<WholesaleItemDTO>>(`/wholesale/items${query}`, {
    tags: [CacheTags.wholesale],
    revalidate: Revalidate.short,
  });

  return {
    items: data.items.map(toWholesaleCardVM),
    page: data.page,
    pageSize: data.pageSize,
    total: data.total,
    totalPages: data.totalPages,
  };
}

export async function getWholesaleItem(idOrSlug: string): Promise<WholesaleCardVM | null> {
  try {
    const { item } = await apiGet<{ item: WholesaleItemDTO }>(
      `/wholesale/items/${encodeURIComponent(idOrSlug)}`,
      {
        tags: [CacheTags.wholesale, CacheTags.wholesaleItem(idOrSlug)],
        revalidate: Revalidate.default,
      },
    );
    return toWholesaleCardVM(item);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return null;
    throw err;
  }
}

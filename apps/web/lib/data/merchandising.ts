import "server-only";

import type { CursorPage, HomepageDTO, MerchandisingCollectionDTO, MerchandisingProductDTO } from "@nuru/types";
import { apiGet, ApiError } from "@/lib/server/http";
import { CacheTags, Revalidate } from "@/lib/server/cache-tags";

export async function getHomepageMerchandising(): Promise<HomepageDTO> {
  try {
    return await apiGet<HomepageDTO>("/homepage?device=desktop", {
      tags: [CacheTags.homepage],
      revalidate: Revalidate.short,
    });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    console.warn("Merchandising layout unavailable; rendering the independent homepage surfaces.");
    return {
      generatedAt: new Date().toISOString(),
      personalization: "fallback",
      experimentAssignments: {},
      sections: [],
    };
  }
}

export async function getCollectionMerchandising(key: string, limit = 60) {
  const [{ collections }, products] = await Promise.all([
    apiGet<{ collections: MerchandisingCollectionDTO[] }>("/collections", {
      tags: [CacheTags.homepage], revalidate: Revalidate.short,
    }),
    apiGet<CursorPage<MerchandisingProductDTO>>(
      `/collections/${encodeURIComponent(key)}/products?limit=${Math.min(limit, 100)}`,
      { tags: [CacheTags.homepage, CacheTags.products], revalidate: Revalidate.short },
    ),
  ]);
  return { collection: collections.find((item) => item.key === key) ?? null, products };
}

import type { MerchandisingCollection, Prisma, Product } from "@nuru/db";
import type {
  MerchandisingCollectionDTO,
  MerchandisingProductDTO,
} from "@nuru/types";
import { toProductDTO, type ProductWithCategory } from "../catalog/serializers.js";

export function toCollectionDTO(c: MerchandisingCollection): MerchandisingCollectionDTO {
  return {
    id: c.id,
    key: c.key,
    displayName: c.displayName,
    shortName: c.shortName,
    description: c.description,
    collectionType: c.collectionType,
    selectionStrategy: c.selectionStrategy,
    status: c.status,
    priority: c.priority,
    placement: c.placement,
    startAt: c.startAt?.toISOString() ?? null,
    endAt: c.endAt?.toISOString() ?? null,
    maxProducts: c.maxProducts,
    sortStrategy: c.sortStrategy,
    eligibilityRules: c.eligibilityRules,
    configuration: c.configuration,
    imageUrl: c.imageUrl,
    icon: c.icon,
    badgeText: c.badgeText,
    ctaText: c.ctaText,
    ctaUrl: c.ctaUrl,
    isPersonalized: c.isPersonalized,
    isSponsored: c.isSponsored,
    cacheVersion: c.cacheVersion,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export type PricedProduct = ProductWithCategory & {
  effectivePrice: Prisma.Decimal;
  promotionId: string | null;
  promotionEndsAt: Date | null;
  rankingScore: number;
  rank: number;
  rankingSource: string;
};

export function toMerchandisingProductDTO(p: PricedProduct): MerchandisingProductDTO {
  const base = (p.sellingPrice ?? p.price).toString();
  return {
    ...toProductDTO(p as Product & ProductWithCategory),
    effectivePrice: p.effectivePrice.toString(),
    basePrice: base,
    promotionId: p.promotionId,
    promotionEndsAt: p.promotionEndsAt?.toISOString() ?? null,
    rankingScore: p.rankingScore,
    rank: p.rank,
    rankingSource: p.rankingSource,
  };
}


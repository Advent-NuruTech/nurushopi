import { productVariantsSchema } from "@nuru/types";
import type { Banner, Category, HeroAnnouncement, Prisma, Product } from "@nuru/db";
import type { BannerDTO, CategoryDTO, HeroAnnouncementDTO, ProductDTO } from "@nuru/types";

const toIso = (d: Date): string => d.toISOString();
const decToStr = (d: Prisma.Decimal | null | undefined): string | null =>
  d == null ? null : d.toString();

export type CategoryWithCount = Category & {
  _count?: { products: number };
  products?: Array<{ images: string[] }>;
};

export function toCategoryDTO(c: CategoryWithCount): CategoryDTO {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    imageUrl: c.imageUrl ?? c.products?.[0]?.images[0] ?? null,
    description: c.description,
    sortOrder: c.sortOrder,
    ...(c._count ? { productCount: c._count.products } : {}),
    createdAt: toIso(c.createdAt),
    updatedAt: toIso(c.updatedAt),
  };
}

export type ProductWithCategory = Product & {
  category?: Pick<Category, "id" | "name" | "slug"> | null;
};

function ratingDistribution(
  value: Prisma.JsonValue | null,
): ProductDTO["ratingSummary"]["distribution"] {
  const empty = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
  for (const key of Object.keys(empty) as Array<keyof typeof empty>) {
    const count = (value as Record<string, unknown>)[key];
    empty[key] =
      typeof count === "number" && Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  }
  return empty;
}

export function toProductDTO(p: ProductWithCategory): ProductDTO {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    brandName: p.brandName,
    storeName: p.storeName,
    description: p.description,
    shortDescription: p.shortDescription,
    price: p.price.toString(),
    originalPrice: decToStr(p.originalPrice),
    sellingPrice: decToStr(p.sellingPrice),
    images: p.images,
    variants: productVariantsSchema.parse(p.variants ?? []),
    stock: p.stock,
    inStock: p.stock > 0,
    lowStockThreshold: p.lowStockThreshold,
    stockStatus:
      p.stock <= 0 ? "OUT_OF_STOCK" : p.stock <= p.lowStockThreshold ? "LOW_STOCK" : "IN_STOCK",
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    vendorId: p.vendorId,
    categoryId: p.categoryId,
    category: p.category
      ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
      : null,
    ratingSummary: {
      average: Number(p.ratingAverage),
      count: p.ratingCount,
      distribution: ratingDistribution(p.ratingDistribution),
    },
    createdAt: toIso(p.createdAt),
    updatedAt: toIso(p.updatedAt),
  };
}

export function toBannerDTO(b: Banner): BannerDTO {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    imageUrl: b.imageUrl,
    linkUrl: b.linkUrl,
    isActive: b.isActive,
    sortOrder: b.sortOrder,
    createdAt: toIso(b.createdAt),
    updatedAt: toIso(b.updatedAt),
  };
}

export function toHeroDTO(h: HeroAnnouncement): HeroAnnouncementDTO {
  return {
    id: h.id,
    message: h.message,
    linkUrl: h.linkUrl,
    gradient: h.gradient,
    order: h.displayOrder,
    isActive: h.isActive,
    startsAt: h.startsAt ? toIso(h.startsAt) : null,
    endsAt: h.endsAt ? toIso(h.endsAt) : null,
    createdAt: toIso(h.createdAt),
    updatedAt: toIso(h.updatedAt),
  };
}

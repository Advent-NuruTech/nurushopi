import type {
  Banner,
  Category,
  HeroAnnouncement,
  Prisma,
  Product,
} from "@nuru/db";
import type {
  BannerDTO,
  CategoryDTO,
  HeroAnnouncementDTO,
  ProductDTO,
} from "@nuru/types";

const toIso = (d: Date): string => d.toISOString();
const decToStr = (d: Prisma.Decimal | null | undefined): string | null =>
  d == null ? null : d.toString();

export type CategoryWithCount = Category & {
  _count?: { products: number };
};

export function toCategoryDTO(c: CategoryWithCount): CategoryDTO {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
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

export function toProductDTO(p: ProductWithCategory): ProductDTO {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    shortDescription: p.shortDescription,
    price: p.price.toString(),
    originalPrice: decToStr(p.originalPrice),
    sellingPrice: decToStr(p.sellingPrice),
    images: p.images,
    stock: p.stock,
    inStock: p.stock > 0,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    categoryId: p.categoryId,
    category: p.category
      ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
      : null,
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
    isActive: h.isActive,
    startsAt: h.startsAt ? toIso(h.startsAt) : null,
    endsAt: h.endsAt ? toIso(h.endsAt) : null,
    createdAt: toIso(h.createdAt),
    updatedAt: toIso(h.updatedAt),
  };
}

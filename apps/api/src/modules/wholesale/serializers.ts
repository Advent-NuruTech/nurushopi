import { productVariantsSchema } from "@nuru/types";
import type { Category, WholesaleItem } from "@nuru/db";
import type { WholesaleItemDTO } from "@nuru/types";

const toIso = (d: Date): string => d.toISOString();

export type WholesaleItemWithCategory = WholesaleItem & {
  category?: Pick<Category, "id" | "name" | "slug"> | null;
};

export function toWholesaleItemDTO(w: WholesaleItemWithCategory): WholesaleItemDTO {
  return {
    id: w.id,
    name: w.name,
    slug: w.slug,
    sku: w.sku,
    description: w.description,
    unitPrice: w.unitPrice.toString(),
    minQuantity: w.minQuantity,
    stock: w.stock,
    inStock: w.stock > 0,
    images: w.images,
    variants: productVariantsSchema.parse(w.variants ?? []),
    isActive: w.isActive,
    vendorId: w.vendorId,
    categoryId: w.categoryId,
    category: w.category
      ? { id: w.category.id, name: w.category.name, slug: w.category.slug }
      : null,
    createdAt: toIso(w.createdAt),
    updatedAt: toIso(w.updatedAt),
  };
}

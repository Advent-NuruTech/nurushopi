import type { WholesaleItem } from "@nuru/db";
import type { WholesaleItemDTO } from "@nuru/types";

const toIso = (d: Date): string => d.toISOString();

export function toWholesaleItemDTO(w: WholesaleItem): WholesaleItemDTO {
  return {
    id: w.id,
    name: w.name,
    slug: w.slug,
    description: w.description,
    unitPrice: w.unitPrice.toString(),
    minQuantity: w.minQuantity,
    images: w.images,
    isActive: w.isActive,
    createdAt: toIso(w.createdAt),
    updatedAt: toIso(w.updatedAt),
  };
}

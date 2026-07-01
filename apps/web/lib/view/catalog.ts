import type { Route } from "next";
import type { BannerDTO, ProductDTO, WholesaleItemDTO } from "@nuru/types";

/**
 * View models for the public storefront.
 *
 * The API serialises money as strings (to avoid float precision loss). The UI
 * works in numbers and uses `lib/pricing` + `lib/formatPrice`, so these mappers
 * are the single boundary where DTOs become render-ready view models. Pages and
 * components depend on these VMs, never on raw DTOs — so an API contract change
 * is absorbed here instead of rippling through every component.
 */

const FALLBACK_IMAGE = "/assets/logo.jpg";
const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Parse a decimal-string money field to a finite number (0 on failure). */
function money(value: string | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function firstImage(images: string[] | undefined): string {
  return images && images.length > 0 ? images[0] : FALLBACK_IMAGE;
}

export interface ProductCardVM {
  id: string;
  slug: string;
  /**
   * Canonical detail link (slug when present, else id). Typed as the branded
   * `Route` so `<Link>` consumers don't need to cast — the one cast lives in the
   * mapper below, at the single construction point.
   */
  href: Route;
  name: string;
  image: string;
  images: string[];
  categoryName: string | null;
  categorySlug: string | null;
  /** Numeric price fields — shaped for `lib/pricing` helpers. */
  price: number;
  sellingPrice: number;
  originalPrice?: number;
  inStock: boolean;
  shortDescription: string | null;
  createdAtMs: number;
  isNew: boolean;
}

export interface ProductDetailVM extends ProductCardVM {
  description: string | null;
}

export function toProductCardVM(p: ProductDTO): ProductCardVM {
  const handle = p.slug ?? p.id;
  const selling = money(p.sellingPrice ?? p.price);
  const original = p.originalPrice != null ? money(p.originalPrice) : undefined;
  const createdAtMs = Date.parse(p.createdAt) || 0;

  return {
    id: p.id,
    slug: handle,
    href: `/products/${handle}` as Route,
    name: p.name,
    image: firstImage(p.images),
    images: p.images.length > 0 ? p.images : [FALLBACK_IMAGE],
    categoryName: p.category?.name ?? null,
    categorySlug: p.category?.slug ?? null,
    price: selling,
    sellingPrice: selling,
    originalPrice: original && original > 0 ? original : undefined,
    inStock: p.inStock,
    shortDescription: p.shortDescription,
    createdAtMs,
    isNew: createdAtMs > 0 && Date.now() - createdAtMs <= NEW_WINDOW_MS,
  };
}

export function toProductDetailVM(p: ProductDTO): ProductDetailVM {
  return { ...toProductCardVM(p), description: p.description };
}

export interface WholesaleCardVM {
  id: string;
  slug: string;
  href: Route;
  name: string;
  image: string;
  images: string[];
  unitPrice: number;
  minQuantity: number;
  stock: number;
  inStock: boolean;
  description: string | null;
}

export function toWholesaleCardVM(w: WholesaleItemDTO): WholesaleCardVM {
  const handle = w.slug ?? w.id;
  return {
    id: w.id,
    slug: handle,
    href: `/wholeseller/${handle}` as Route,
    name: w.name,
    image: firstImage(w.images),
    images: w.images.length > 0 ? w.images : [FALLBACK_IMAGE],
    unitPrice: money(w.unitPrice),
    minQuantity: w.minQuantity,
    stock: w.stock,
    inStock: w.inStock,
    description: w.description,
  };
}

export interface BannerVM {
  id: string;
  href: Route;
  title: string;
  subtitle: string | null;
  image: string | null;
  linkUrl: string | null;
}

export function toBannerVM(b: BannerDTO): BannerVM {
  return {
    id: b.id,
    href: `/banners/${b.id}` as Route,
    title: b.title ?? "",
    subtitle: b.subtitle,
    image: b.imageUrl || null,
    linkUrl: b.linkUrl,
  };
}

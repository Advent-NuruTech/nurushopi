"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Boxes, Megaphone, Plus, Sparkles } from "lucide-react";
import type { ReviewSummaryDTO } from "@nuru/types";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { formatCategoryLabel } from "@/lib/categoryUtils";
import { formatPrice } from "@/lib/formatPrice";
import { getDiscountPercent, getOriginalPrice, getSellingPrice } from "@/lib/pricing";
import { useSabbathStatus } from "@/lib/useSabbathStatus";
import RatingStars from "@/components/ui/RatingStars";
import type { BannerVM, WholesaleCardVM } from "@/lib/view/catalog";

interface Product {
  id: string;
  slug?: string;
  name: string;
  brandName?: string | null;
  storeName?: string | null;
  image: string;
  category: string;
  price: number;
  originalPrice?: number;
  sellingPrice?: number;
  shortDescription?: string;
  description?: string;
  inStock?: boolean;
  stock?: number;
  stockStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  ratingSummary?: ReviewSummaryDTO;
  createdAt?: number | string | null;
  isNew?: boolean;
}

interface Category {
  name: string;
  slug: string;
  image?: string;
}

export interface MerchandisingFeedCard {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  badge?: string | null;
  cta?: string | null;
  href: Route;
}

interface FeaturedSectionProps {
  products: Product[];
  categories?: Category[];
  promotions?: BannerVM[];
  wholesale?: WholesaleCardVM[];
  merchandising?: MerchandisingFeedCard[];
  title?: string;
  preserveProductOrder?: boolean;
  enableFeedModules?: boolean;
}

type FeedModule = "category" | "merchandising" | "promotion" | "wholesale";

const FEED_MODULE_INTERVAL = 6;

function toMillis(value: Product["createdAt"]): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export default function FeaturedSection({
  products,
  categories = [],
  promotions = [],
  wholesale = [],
  merchandising = [],
  title,
  preserveProductOrder = false,
  enableFeedModules = true,
}: FeaturedSectionProps) {
  const { addToCart } = useCart();
  const { isClosed: sabbathClosed } = useSabbathStatus();

  const derivedCategories: Category[] = Array.from(
    new Set(products.map((product) => product.category?.toLowerCase().trim()).filter(Boolean)),
  ).map((slug) => ({ slug, name: formatCategoryLabel(slug) }));
  const categoryList = categories.length ? categories : derivedCategories;

  // Preserve merchandising order but render one uninterrupted grid. Sparse
  // categories can no longer leave empty columns before the next group.
  const orderedProducts = preserveProductOrder
    ? products
    : [
        ...categoryList.flatMap((category) =>
          products
            .filter((product) => product.category?.toLowerCase() === category.slug.toLowerCase())
            .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)),
        ),
        ...products.filter(
          (product) =>
            !categoryList.some(
              (category) => category.slug.toLowerCase() === product.category?.toLowerCase(),
            ),
        ),
      ].filter(
        (product, index, list) => list.findIndex((item) => item.id === product.id) === index,
      );

  // Modules are data-driven and alternate at a steady cadence. Adding or
  // removing an admin-managed source automatically rebalances the feed without
  // changing the relative order of any products.
  const availableModules: FeedModule[] = enableFeedModules
    ? [
        ...(categoryList.length ? (["category"] as const) : []),
        ...(merchandising.length ? (["merchandising"] as const) : []),
        ...(promotions.length ? (["promotion"] as const) : []),
        ...(wholesale.length ? (["wholesale"] as const) : []),
      ]
    : [];

  const handleAddToCart = (product: Product) => {
    if (sabbathClosed || product.inStock === false) return;
    addToCart({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brandName: product.brandName,
      storeName: product.storeName,
      price: getSellingPrice(product),
      quantity: 1,
      image: product.image,
      maxQuantity: product.stock,
    });
  };

  if (!orderedProducts.length) return null;

  return (
    <section className="w-full bg-slate-50 py-7 dark:bg-black sm:py-10" aria-label="Products">
      <div className="mx-auto w-full max-w-7xl px-1 sm:px-3">
        {title && (
          <div className="mb-5 flex items-end justify-between gap-4 px-1">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#006B2C] dark:text-[#00C83A]">
                Curated for you
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {title}
              </h2>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#009933] hover:text-[#006B2C] dark:text-[#00C83A]"
            >
              Shop all <ArrowRight size={16} />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 items-stretch gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {orderedProducts.map((item, index) => {
            const discountPercent = getDiscountPercent(item);
            const originalPrice = getOriginalPrice(item);
            const sellingPrice = getSellingPrice(item);
            const inStock = item.inStock !== false;
            const shouldInsertModule =
              availableModules.length > 0 && (index + 1) % FEED_MODULE_INTERVAL === 0;
            const moduleSlot = Math.floor(index / FEED_MODULE_INTERVAL);
            const moduleKind = shouldInsertModule
              ? availableModules[moduleSlot % availableModules.length]
              : null;
            const moduleCycle = Math.floor(moduleSlot / Math.max(availableModules.length, 1));
            const discoveryIndex = moduleCycle * 4;
            const discoveryCategories = Array.from(
              { length: Math.min(4, categoryList.length) },
              (_, offset) => categoryList[(discoveryIndex + offset) % categoryList.length],
            );
            const promotion = promotions[moduleCycle % Math.max(promotions.length, 1)];
            const wholesaleItem = wholesale[moduleCycle % Math.max(wholesale.length, 1)];
            const merchandisingCard =
              merchandising[moduleCycle % Math.max(merchandising.length, 1)];

            return (
              <div key={item.id} className="contents">
                <motion.article
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.35 }}
                  className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                >
                  <Link href={`/products/${item.slug ?? item.id}`} className="block flex-1">
                    <div className="relative aspect-square overflow-hidden bg-white dark:bg-slate-950">
                      <Image
                        src={item.image || "/assets/logo.png"}
                        alt={item.name}
                        fill
                        className="object-contain p-2 transition-transform duration-500 group-hover:scale-105 sm:p-3"
                        sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
                        priority={index < 4}
                      />
                      <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          {item.isNew && (
                            <span className="w-fit rounded-full bg-[#009933] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white sm:text-[10px]">
                              New
                            </span>
                          )}
                          {!inStock && (
                            <span className="w-fit rounded-full bg-slate-900/90 px-2 py-1 text-[9px] font-bold text-white sm:text-[10px]">
                              Out of stock
                            </span>
                          )}
                        </div>
                        {discountPercent && (
                          <span className="rounded-full bg-rose-600 px-2 py-1 text-[9px] font-bold text-white sm:text-[10px]">
                            -{discountPercent}%
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="px-3 pb-2 pt-3 sm:px-4">
                      <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {item.brandName || item.storeName || formatCategoryLabel(item.category)}
                      </p>
                      <h3 className="mt-1 line-clamp-2 min-h-9 text-xs font-semibold leading-[1.15rem] text-slate-900 dark:text-white sm:text-sm">
                        {item.name}
                      </h3>
                      {item.ratingSummary && (
                        <RatingStars
                          summary={item.ratingSummary}
                          size={12}
                          showValue={false}
                          className="mt-1.5 [&_span]:text-[10px]"
                        />
                      )}
                    </div>
                  </Link>

                  <div className="mt-auto flex items-end justify-between gap-2 px-3 pb-3 sm:px-4 sm:pb-4">
                    <div className="min-w-0">
                      {discountPercent && originalPrice && (
                        <p className="text-[10px] text-slate-400 line-through sm:text-xs">
                          {formatPrice(originalPrice)}
                        </p>
                      )}
                      <p className="truncate text-sm font-extrabold text-slate-950 dark:text-white sm:text-base">
                        {formatPrice(sellingPrice)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={sabbathClosed || !inStock}
                      aria-label={`Add ${item.name} to cart`}
                      title={!inStock ? "Out of stock" : "Add to cart"}
                      className="h-9 w-9 shrink-0 rounded-full bg-[#009933] p-0 text-white hover:bg-[#006B2C] disabled:bg-slate-300"
                      onClick={() => handleAddToCart(item)}
                    >
                      <Plus size={17} />
                    </Button>
                  </div>
                </motion.article>

                {moduleKind === "category" && (
                  <motion.aside
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-70px" }}
                    transition={{ duration: 0.45 }}
                    className="flex min-h-full flex-col rounded-2xl bg-gradient-to-br from-[#003D19] via-[#006B2C] to-[#009933] p-3 text-white shadow-lg sm:p-5"
                    aria-label="Explore categories"
                  >
                    <Sparkles className="text-[#B8F5C8]" size={20} />
                    <h3 className="mt-2 text-base font-bold leading-tight sm:text-xl">
                      Find more you&apos;ll love
                    </h3>
                    <p className="mt-1 hidden text-xs leading-5 text-[#DDFBE5]/85 sm:block">
                      Explore popular departments without leaving your discovery flow.
                    </p>
                    <div className="mt-3 grid gap-2 sm:mt-4">
                      {discoveryCategories.map((category) => (
                        <Link
                          key={category.slug}
                          href={`/shop?category=${encodeURIComponent(category.slug)}`}
                          className="flex min-w-0 items-center gap-2 rounded-xl bg-white/95 p-1.5 text-slate-900 transition hover:bg-white sm:p-2"
                        >
                          <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#EFFCF3] sm:h-10 sm:w-10">
                            <Image
                              src={category.image || "/assets/logo.png"}
                              alt=""
                              fill
                              className="object-contain p-1"
                              sizes="40px"
                            />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold sm:text-sm">
                            {category.name || formatCategoryLabel(category.slug)}
                          </span>
                          <ArrowRight className="shrink-0 text-[#009933]" size={14} />
                        </Link>
                      ))}
                    </div>
                  </motion.aside>
                )}

                {moduleKind === "merchandising" && merchandisingCard && (
                  <motion.aside
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-70px" }}
                    transition={{ duration: 0.45 }}
                    className="group relative min-h-full overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-sm dark:border-brand-strong dark:bg-[#063D1E]"
                    aria-label={`Featured collection: ${merchandisingCard.title}`}
                  >
                    <Link
                      href={merchandisingCard.href}
                      className="flex h-full min-h-[300px] flex-col"
                    >
                      {merchandisingCard.image && (
                        <Image
                          src={merchandisingCard.image}
                          alt=""
                          fill
                          className="object-cover opacity-20 transition duration-500 group-hover:scale-105 dark:opacity-15"
                          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
                        />
                      )}
                      <div className="relative z-10 flex h-full flex-1 flex-col p-4 sm:p-5">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand-strong shadow-sm dark:bg-slate-900 dark:text-brand-bright">
                          <Sparkles size={19} />
                        </span>
                        <p className="mt-auto pt-8 text-[10px] font-extrabold uppercase tracking-[0.16em] text-brand-strong dark:text-brand-bright">
                          {merchandisingCard.badge || "Featured collection"}
                        </p>
                        <h3 className="mt-2 text-lg font-bold leading-tight text-slate-950 sm:text-xl dark:text-white">
                          {merchandisingCard.title}
                        </h3>
                        {merchandisingCard.description && (
                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600 dark:text-slate-300">
                            {merchandisingCard.description}
                          </p>
                        )}
                        <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-strong dark:text-brand-bright">
                          {merchandisingCard.cta || "Explore collection"} <ArrowRight size={14} />
                        </span>
                      </div>
                    </Link>
                  </motion.aside>
                )}

                {moduleKind === "promotion" && promotion && (
                  <motion.aside
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-70px" }}
                    transition={{ duration: 0.45 }}
                    className="group relative min-h-full overflow-hidden rounded-2xl bg-slate-950 shadow-lg"
                    aria-label={`Promotion: ${promotion.title}`}
                  >
                    <Link href={promotion.href} className="flex h-full min-h-[300px] flex-col">
                      {promotion.image && (
                        <Image
                          src={promotion.image}
                          alt=""
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/10" />
                      <div className="relative z-10 mt-auto p-4 text-white sm:p-5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide">
                          <Megaphone size={12} /> Promotion
                        </span>
                        <h3 className="mt-3 line-clamp-2 text-lg font-bold leading-tight sm:text-xl">
                          {promotion.title}
                        </h3>
                        {promotion.subtitle && (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-200">
                            {promotion.subtitle
                              .replace(/\*\*|__/g, " ")
                              .replace(/\s+/g, " ")
                              .trim()}
                          </p>
                        )}
                        <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-brand-bright">
                          View offer <ArrowRight size={14} />
                        </span>
                      </div>
                    </Link>
                  </motion.aside>
                )}

                {moduleKind === "wholesale" && wholesaleItem && (
                  <motion.aside
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-70px" }}
                    transition={{ duration: 0.45 }}
                    className="group flex min-h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand dark:border-brand-strong dark:bg-slate-900"
                    aria-label={`Wholesale pick: ${wholesaleItem.name}`}
                  >
                    <Link href={wholesaleItem.href} className="flex h-full flex-1 flex-col">
                      <div className="relative aspect-square overflow-hidden bg-brand-surface dark:bg-[#063D1E]/45">
                        <Image
                          src={wholesaleItem.image}
                          alt={wholesaleItem.name}
                          fill
                          className="object-contain p-3 transition duration-500 group-hover:scale-105"
                          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
                        />
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-white sm:text-[10px]">
                          <Boxes size={12} /> Wholesale
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-3 sm:p-4">
                        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-900 dark:text-white sm:text-[15px]">
                          {wholesaleItem.name}
                        </h3>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          Minimum {wholesaleItem.minQuantity} units
                        </p>
                        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-brand-strong dark:text-brand-bright">
                              Per unit
                            </p>
                            <p className="text-sm font-extrabold text-slate-950 dark:text-white sm:text-base">
                              {formatPrice(wholesaleItem.unitPrice)}
                            </p>
                          </div>
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white transition group-hover:bg-brand-strong">
                            <ArrowRight size={16} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.aside>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/shop"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 text-sm font-bold text-slate-900 shadow-sm transition hover:border-[#009933] hover:text-[#006B2C] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            Explore the full collection <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgePercent,
  ChevronRight,
  Grid3X3,
  Headphones,
  Package,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import type { Route } from "next";

import { formatPrice } from "@/lib/formatPrice";

export interface SidebarCategory {
  id: string;
  name: string;
  slug: string;
  href: string;
  image: string;
  productCount?: number;
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  categories: SidebarCategory[];
  initialView: "menu" | "categories";
  setView: (view: "menu" | "categories") => void;
}

interface ProductPreview {
  id: string;
  slug: string | null;
  name: string;
  image: string;
  price: number;
}

export default function Sidebar({
  isOpen,
  setIsOpen,
  categories,
  initialView,
  setView,
}: SidebarProps) {
  const [selectedCategory, setSelectedCategory] = useState<SidebarCategory | null>(null);
  const [products, setProducts] = useState<ProductPreview[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen || initialView !== "categories") return;
    if (!selectedCategory && categories.length > 0) setSelectedCategory(categories[0]);
  }, [categories, initialView, isOpen, selectedCategory]);

  useEffect(() => {
    if (!isOpen || initialView !== "categories" || !selectedCategory) return;
    let cancelled = false;
    setIsLoadingProducts(true);
    fetch(`/api/catalog-preview?category=${encodeURIComponent(selectedCategory.slug)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load category preview");
        return (await response.json()) as { items: ProductPreview[] };
      })
      .then(({ items }) => {
        if (!cancelled) setProducts(items);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialView, isOpen, selectedCategory]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [setIsOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] cursor-default bg-slate-950/45 backdrop-blur-sm"
            onClick={close}
          />

          <motion.aside
            ref={sidebarRef}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed bottom-0 left-0 top-0 z-[70] flex w-[min(90vw,390px)] flex-col bg-white shadow-2xl dark:bg-slate-950"
            role="dialog"
            aria-modal="true"
            aria-label={initialView === "categories" ? "Browse categories" : "More navigation"}
          >
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-3">
                <Image
                  src="/assets/logo.png"
                  alt=""
                  width={38}
                  height={38}
                  className="rounded-full object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-950 dark:text-white">
                    {initialView === "categories" ? "Shop categories" : "Explore NuruShop"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {initialView === "categories" ? "Find what you need faster" : "More ways to shop"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </header>

            {initialView === "menu" ? (
              <div className="flex-1 overflow-y-auto px-4 py-5">
                <button
                  type="button"
                  onClick={() => setView("categories")}
                  className="flex w-full items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-left ring-1 ring-emerald-100 transition hover:bg-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-900 dark:hover:bg-emerald-950"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#009933] text-white">
                    <Grid3X3 size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-slate-900 dark:text-white">
                      Browse categories
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      See departments and their products
                    </span>
                  </span>
                  <ChevronRight size={20} className="text-slate-400" />
                </button>

                <p className="mb-2 mt-7 px-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  More from NuruShop
                </p>
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                  {[
                    { href: "/shop", label: "Shop all products", icon: ShoppingBag },
                    { href: "/banners", label: "Promotions & offers", icon: BadgePercent },
                    { href: "/wholeseller", label: "Wholesale & bulk", icon: Package },
                    { href: "/new-arrivals", label: "New arrivals", icon: Sparkles },
                    { href: "/contact", label: "Help & contact", icon: Headphones },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href as Route}
                        onClick={close}
                        className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-700 transition last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        <Icon size={19} className="text-slate-400" />
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight size={17} className="text-slate-400" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8 pt-4">
                {categories.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-2.5" aria-label="Product categories">
                      {categories.map((category) => {
                        const selected = selectedCategory?.id === category.id;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setSelectedCategory(category)}
                            className={`min-w-0 rounded-xl p-2 text-center transition ${
                              selected
                                ? "bg-emerald-50 ring-2 ring-[#009933] dark:bg-emerald-950/40"
                                : "bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:ring-slate-800"
                            }`}
                            aria-pressed={selected}
                          >
                            <span className="relative mx-auto block aspect-square w-full overflow-hidden rounded-lg bg-white dark:bg-slate-950">
                              <Image
                                src={category.image}
                                alt=""
                                fill
                                className="object-contain p-1.5"
                                sizes="100px"
                              />
                            </span>
                            <span
                              className={`mt-1.5 block truncate text-[11px] font-semibold ${
                                selected
                                  ? "text-[#007f2a] dark:text-emerald-400"
                                  : "text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {category.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedCategory && (
                      <section className="mt-7" aria-live="polite">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-lg font-bold text-slate-950 dark:text-white">
                              {selectedCategory.name}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {typeof selectedCategory.productCount === "number"
                                ? `${selectedCategory.productCount} products`
                                : "Latest products"}
                            </p>
                          </div>
                          <Link
                            href={`/shop?category=${encodeURIComponent(selectedCategory.slug)}`}
                            onClick={close}
                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#009933] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#007f2a]"
                          >
                            View all <ArrowRight size={14} />
                          </Link>
                        </div>

                        {isLoadingProducts ? (
                          <div className="grid grid-cols-2 gap-3">
                            {[0, 1, 2, 3].map((item) => (
                              <div
                                key={item}
                                className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                              >
                                <div className="aspect-square animate-pulse bg-slate-100 dark:bg-slate-800" />
                                <div className="space-y-2 p-2.5">
                                  <div className="h-3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : products.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3">
                            {products.map((product) => {
                              const price = Number(product.price);
                              return (
                                <Link
                                  key={product.id}
                                  href={`/products/${product.slug ?? product.id}`}
                                  onClick={close}
                                  className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-emerald-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                >
                                  <span className="relative block aspect-square bg-slate-50 dark:bg-slate-950">
                                    <Image
                                      src={product.image || "/assets/logo.png"}
                                      alt={product.name}
                                      fill
                                      className="object-contain p-2"
                                      sizes="170px"
                                    />
                                  </span>
                                  <span className="block p-2.5">
                                    <span className="line-clamp-2 min-h-8 text-xs font-semibold text-slate-800 dark:text-slate-200">
                                      {product.name}
                                    </span>
                                    {Number.isFinite(price) && (
                                      <span className="mt-1 block text-xs font-bold text-[#00852d] dark:text-emerald-400">
                                        {formatPrice(price)}
                                      </span>
                                    )}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
                            <Package className="mx-auto text-slate-400" size={28} />
                            <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                              No products in this category yet.
                            </p>
                          </div>
                        )}
                      </section>
                    )}
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Grid3X3 size={32} className="text-slate-400" />
                    <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
                      Categories are unavailable
                    </p>
                    <Link
                      href="/shop"
                      onClick={close}
                      className="mt-4 rounded-full bg-[#009933] px-4 py-2 text-sm font-bold text-white"
                    >
                      Browse all products
                    </Link>
                  </div>
                )}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

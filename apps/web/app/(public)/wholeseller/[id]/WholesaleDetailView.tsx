"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  ArrowRight,
  Boxes,
  Check,
  ChevronRight,
  CreditCard,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";

import WholesaleGrid from "@/components/wholesale/WholesaleGrid";
import { Button } from "@/components/ui/button";
import ExpandableDescription from "@/components/ui/ExpandableDescription";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/formatPrice";
import { getDiscountPercent, getOriginalPrice, getSellingPrice } from "@/lib/pricing";
import { useSabbathStatus } from "@/lib/useSabbathStatus";
import type { ProductCardVM, WholesaleCardVM } from "@/lib/view/catalog";

export default function WholesaleDetailView({
  product,
  related,
  retailSuggestions,
}: {
  product: WholesaleCardVM;
  related: WholesaleCardVM[];
  retailSuggestions: ProductCardVM[];
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { isClosed: sabbathClosed } = useSabbathStatus();
  const minQty = Math.max(1, product.minQuantity);
  const inStock = product.inStock && product.stock >= minQty;
  const [mainImage, setMainImage] = useState(product.images[0]);
  const [quantity, setQuantity] = useState(minQty);
  const [isStickyVisible, setIsStickyVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById("wholesale-actions");
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStickyVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -72px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const addCurrentQuantity = () => {
    if (sabbathClosed || !inStock) return;
    addToCart({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.unitPrice,
      quantity,
      image: mainImage,
      maxQuantity: product.stock,
      category: product.categorySlug ?? undefined,
      mode: "wholesale",
    });
  };

  const buyNow = () => {
    if (sabbathClosed || !inStock) return;
    addCurrentQuantity();
    router.push("/checkout" as Route);
  };

  const description =
    product.description?.trim() ||
    "More information about this wholesale product will be available soon.";

  return (
    <main className="-mx-2 min-h-screen bg-slate-50 pb-20 text-slate-950 dark:bg-slate-950 dark:text-white sm:-mx-4 lg:-mx-8">
      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-5 flex min-w-0 items-center gap-1.5 overflow-hidden text-xs text-slate-500 sm:text-sm dark:text-slate-400"
        >
          <Link href="/" className="shrink-0 transition hover:text-brand">
            Home
          </Link>
          <ChevronRight size={14} className="shrink-0" />
          <Link href="/wholeseller" className="shrink-0 transition hover:text-brand">
            Wholesale
          </Link>
          {product.categoryName && (
            <>
              <ChevronRight size={14} className="shrink-0" />
              <Link
                href={`/wholeseller?category=${encodeURIComponent(product.categorySlug ?? "")}`}
                className="truncate transition hover:text-brand"
              >
                {product.categoryName}
              </Link>
            </>
          )}
        </nav>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(390px,0.88fr)] xl:gap-10">
          <section className="min-w-0 lg:sticky lg:top-24">
            <div className="relative aspect-square max-h-[680px] w-full overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900">
              <Image
                src={mainImage}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 58vw"
                className="object-contain p-6 sm:p-10"
              />
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm">
                <Boxes size={14} /> Wholesale
              </span>
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:mt-4 sm:gap-3">
                {product.images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setMainImage(image)}
                    aria-label={`View product image ${index + 1}`}
                    aria-pressed={mainImage === image}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition sm:h-20 sm:w-20 dark:bg-slate-900 ${mainImage === image ? "border-brand shadow-sm" : "border-transparent ring-1 ring-slate-200 hover:border-slate-300 dark:ring-slate-700"}`}
                  >
                    <Image src={image} alt="" fill sizes="80px" className="object-contain p-1.5" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="min-w-0">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-strong dark:text-brand-bright">
                {product.categoryName || "NuruShop wholesale"}
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-[2rem]">
                {product.name}
              </h1>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/70">
                <p className="text-3xl font-black tracking-tight sm:text-4xl">
                  {formatPrice(product.unitPrice)}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Price per unit · minimum {minQty} units
                </p>
                <p className="mt-3 border-t border-slate-200 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                  Minimum order total{" "}
                  <strong className="text-slate-950 dark:text-white">
                    {formatPrice(product.unitPrice * minQty)}
                  </strong>
                </p>
              </div>

              <div
                className={`mt-5 flex items-center gap-2 text-sm font-bold ${inStock ? "text-brand-strong dark:text-brand-bright" : "text-rose-600"}`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full ${inStock ? "bg-brand-surface-strong dark:bg-[#063D1E]" : "bg-rose-100 dark:bg-rose-950"}`}
                >
                  {inStock ? <Check size={15} /> : <X size={15} />}
                </span>
                {inStock
                  ? `${product.stock} units in stock and ready to order`
                  : `Fewer than the ${minQty}-unit minimum available`}
              </div>

              {inStock && (
                <div className="mt-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Quantity
                    </p>
                    <div
                      className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950"
                      aria-label="Wholesale quantity selector"
                    >
                      <button
                        type="button"
                        onClick={() => setQuantity((value) => Math.max(minQty, value - 1))}
                        disabled={quantity <= minQty}
                        aria-label="Decrease quantity"
                        className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center text-sm font-bold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                        disabled={quantity >= product.stock}
                        aria-label="Increase quantity"
                        className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Order total</p>
                    <p className="mt-1 text-lg font-black">
                      {formatPrice(product.unitPrice * quantity)}
                    </p>
                  </div>
                </div>
              )}

              <div id="wholesale-actions" className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={addCurrentQuantity}
                  disabled={sabbathClosed || !inStock}
                  className="h-12 rounded-xl border-brand text-sm font-bold text-brand-strong hover:bg-brand-surface hover:text-brand-ink disabled:cursor-not-allowed dark:text-brand-bright"
                >
                  <ShoppingCart size={18} /> {inStock ? "Add to cart" : "Out of stock"}
                </Button>
                <Button
                  size="lg"
                  onClick={buyNow}
                  disabled={sabbathClosed || !inStock}
                  className="h-12 gap-2 rounded-xl bg-brand text-sm font-bold hover:bg-brand-strong disabled:cursor-not-allowed"
                >
                  <CreditCard size={18} /> Buy now
                </Button>
              </div>
            </section>

            <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {[
                {
                  icon: Truck,
                  title: "Bulk delivery support",
                  text: "Delivery details are confirmed with your order.",
                },
                {
                  icon: ShieldCheck,
                  title: "Buyer support",
                  text: "Help is available before and after purchase.",
                },
                {
                  icon: PackageCheck,
                  title: "Clear pack quantities",
                  text: `This item has a ${minQty}-unit minimum order.`,
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className={`flex gap-3 p-4 ${index ? "border-t border-slate-100 dark:border-slate-800" : ""}`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-surface text-brand-strong dark:bg-[#063D1E] dark:text-brand-bright">
                    <item.icon size={19} />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold">{item.title}</h2>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          </aside>
        </div>

        <section className="mt-10 rounded-[1.75rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-8 lg:mt-14">
          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-strong dark:text-brand-bright">
                Good to know
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">Product details</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Everything you need for a confident bulk order.
              </p>
            </div>
            <div className="prose prose-slate max-w-none text-sm leading-7 text-slate-700 dark:text-slate-300">
              <ExpandableDescription text={description} />
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-10 lg:mt-14">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-strong dark:text-brand-bright">
                  Wholesale picks
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">You may also like</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  More wholesale options{product.categoryName ? ` in ${product.categoryName}` : ""}.
                </p>
              </div>
              <Link
                href={
                  product.categorySlug
                    ? `/wholeseller?category=${encodeURIComponent(product.categorySlug)}`
                    : "/wholeseller"
                }
                className="hidden items-center gap-1 text-sm font-bold text-brand-strong sm:inline-flex"
              >
                All wholesale <ArrowRight size={16} />
              </Link>
            </div>
            <WholesaleGrid products={related} />
          </section>
        )}

        {retailSuggestions.length > 0 && (
          <section className="mt-12 border-t border-slate-200 pt-10 dark:border-slate-800 lg:mt-16 lg:pt-14">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Prefer a smaller quantity?
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">Shop retail instead</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Individual products are kept separate from wholesale recommendations.
                </p>
              </div>
              <Link
                href={
                  product.categorySlug
                    ? `/shop?category=${encodeURIComponent(product.categorySlug)}`
                    : "/shop"
                }
                className="hidden items-center gap-1 text-sm font-bold text-brand-strong sm:inline-flex"
              >
                Shop retail <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {retailSuggestions.map((item) => {
                const itemPrice = getSellingPrice(item);
                const itemOriginal = getOriginalPrice(item);
                const discount = getDiscountPercent(item);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="relative aspect-square bg-white dark:bg-slate-950">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                      />
                      {discount && (
                        <span className="absolute right-2 top-2 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-bold text-white">
                          -{discount}%
                        </span>
                      )}
                    </div>
                    <div className="p-3 sm:p-4">
                      <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                        Retail
                      </p>
                      <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5">
                        {item.name}
                      </h3>
                      {discount && itemOriginal && (
                        <p className="mt-2 text-[10px] text-slate-400 line-through">
                          {formatPrice(itemOriginal)}
                        </p>
                      )}
                      <p className={`${discount ? "" : "mt-2"} text-sm font-extrabold`}>
                        {formatPrice(itemPrice)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_30px_-18px_rgba(15,23,42,0.45)] backdrop-blur transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900/95 lg:hidden ${isStickyVisible ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <Button
            size="lg"
            variant="outline"
            onClick={addCurrentQuantity}
            disabled={sabbathClosed || !inStock}
            className="h-12 flex-1 gap-2 rounded-xl border-brand p-0 text-sm font-bold text-brand-strong dark:text-brand-bright"
          >
            <ShoppingCart size={18} /> Add {quantity}
          </Button>
          <Button
            size="lg"
            onClick={buyNow}
            disabled={sabbathClosed || !inStock}
            className="h-12 flex-1 gap-2 rounded-xl bg-brand p-0 text-sm font-bold hover:bg-brand-strong"
          >
            <CreditCard size={18} /> Buy now
          </Button>
        </div>
      </div>
    </main>
  );
}

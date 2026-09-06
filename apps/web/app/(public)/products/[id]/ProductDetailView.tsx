"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
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
import type { ReviewSummaryDTO } from "@nuru/types";

import { formatPrice } from "@/lib/formatPrice";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { getDiscountPercent, getOriginalPrice, getSellingPrice } from "@/lib/pricing";
import ExpandableDescription from "@/components/ui/ExpandableDescription";
import { useSabbathStatus } from "@/lib/useSabbathStatus";
import { catalogApi, reviewsApi } from "@/lib/api";
import { toProductCardVM, type ProductCardVM, type ProductDetailVM } from "@/lib/view/catalog";
import RatingStars from "@/components/ui/RatingStars";
import RatingBreakdown from "@/components/ui/RatingBreakdown";
import WishlistPlanner from "@/components/ui/WishlistPlanner";

interface Review {
  id: string;
  userName: string;
  message: string;
  rating: number;
  createdAt?: string;
}

function reviewDate(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
}

/**
 * Create a stable anonymous analytics ID across modern and older mobile
 * browsers. `crypto.randomUUID` is not available in some mobile WebViews and
 * non-secure contexts, so it must never be called without capability checks.
 */
function createViewSessionId(): string {
  const webCrypto = globalThis.crypto;

  if (typeof webCrypto?.randomUUID === "function") {
    return webCrypto.randomUUID();
  }

  if (typeof webCrypto?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    return `view-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }

  // This identifier is only used to deduplicate anonymous product views; it is
  // not a security token. Date/random is therefore an acceptable last fallback.
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export default function ProductDetailView({
  product,
  related,
}: {
  product: ProductDetailVM;
  related: ProductCardVM[];
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { isClosed: sabbathClosed } = useSabbathStatus();
  const [mainImage, setMainImage] = useState(product.images[0]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummaryDTO>(product.ratingSummary);
  const [reviewTotal, setReviewTotal] = useState(product.ratingSummary.count);
  const [recommendations, setRecommendations] = useState<ProductCardVM[]>(related);
  const [isStickyVisible, setIsStickyVisible] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      reviewsApi.listForProduct(product.id, { pageSize: 50 }),
      reviewsApi.summaryForProduct(product.id),
    ])
      .then(([page, { summary }]) => {
        if (cancelled) return;
        setReviewSummary(summary);
        setReviewTotal(page.total);
        setReviews(
          page.items.map((review) => ({
            id: review.id,
            userName: review.userName ?? "Anonymous",
            message: review.comment ?? "",
            rating: review.rating,
            createdAt: review.createdAt,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  useEffect(() => {
    let sessionId: string | null = null;

    try {
      sessionId = localStorage.getItem("nurushop-view-session");
    } catch {
      // Storage can be unavailable in private or restricted mobile WebViews.
    }

    if (!sessionId) {
      sessionId = createViewSessionId();
      try {
        localStorage.setItem("nurushop-view-session", sessionId);
      } catch {
        // View recording still works for this visit without persistence.
      }
    }
    void catalogApi.recordProductView(product.id, sessionId).catch(() => undefined);

    let cancelled = false;
    catalogApi
      .recommendProducts({ productId: product.id, limit: 8 })
      .then(({ products }) => {
        if (!cancelled && products.length) setRecommendations(products.map(toProductCardVM));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  useEffect(() => {
    const target = document.getElementById("product-actions");
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStickyVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -72px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const sellingPrice = getSellingPrice(product);
  const originalPrice = getOriginalPrice(product);
  const discountPercent = getDiscountPercent(product);
  const savings = originalPrice ? Math.max(0, originalPrice - sellingPrice) : 0;
  const productDescription =
    product.description?.trim() ||
    product.shortDescription?.trim() ||
    "More product information will be available soon.";

  const handleAddToCart = () => {
    if (sabbathClosed || !product.inStock) return;
    addToCart({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brandName: product.brandName,
      storeName: product.storeName,
      price: sellingPrice,
      quantity,
      image: mainImage,
      maxQuantity: product.stock,
    });
  };

  const handleBuyNow = () => {
    if (sabbathClosed || !product.inStock) return;
    handleAddToCart();
    router.push("/checkout" as Route);
  };

  const stockLabel =
    product.stockStatus === "LOW_STOCK"
      ? `Only ${product.stock} left — order soon`
      : product.inStock
        ? "In stock and ready to order"
        : "Currently out of stock";

  return (
    <main className="-mx-2 min-h-screen bg-slate-50 pb-16 text-slate-950 dark:bg-slate-950 dark:text-white sm:-mx-4 lg:-mx-8">
      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-5 flex min-w-0 items-center gap-1.5 overflow-hidden text-xs text-slate-500 sm:text-sm dark:text-slate-400"
        >
          <Link href="/" className="shrink-0 transition hover:text-[#009933]">
            Home
          </Link>
          <ChevronRight size={14} className="shrink-0" />
          <Link href="/shop" className="shrink-0 transition hover:text-[#009933]">
            Shop
          </Link>
          {product.categoryName && (
            <>
              <ChevronRight size={14} className="shrink-0" />
              <Link
                href={`/shop?category=${encodeURIComponent(product.categorySlug ?? "")}`}
                className="truncate transition hover:text-[#009933]"
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
                className="object-contain p-6 sm:p-10"
                sizes="(max-width: 1023px) 100vw, 58vw"
                priority
              />
              <div className="absolute left-4 top-4 flex flex-col gap-2">
                {discountPercent && (
                  <span className="rounded-full bg-rose-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-sm">
                    Save {discountPercent}%
                  </span>
                )}
                {product.isNew && (
                  <span className="w-fit rounded-full bg-[#009933] px-3 py-1.5 text-xs font-bold text-white shadow-sm">
                    New arrival
                  </span>
                )}
              </div>
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
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition sm:h-20 sm:w-20 dark:bg-slate-900 ${
                      mainImage === image
                        ? "border-[#009933] shadow-sm"
                        : "border-transparent ring-1 ring-slate-200 hover:border-slate-300 dark:ring-slate-700"
                    }`}
                  >
                    <Image src={image} alt="" fill className="object-contain p-1.5" sizes="80px" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <aside className="min-w-0">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#006B2C] dark:text-[#00C83A]">
                {product.categoryName || "NuruShop collection"}
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-[2rem]">
                {product.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <a href="#reviews" className="rounded-full transition hover:bg-amber-50">
                  <RatingStars summary={reviewSummary} size={15} />
                </a>
                <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {reviewTotal
                    ? `${reviewTotal} verified review${reviewTotal === 1 ? "" : "s"}`
                    : "Not yet reviewed"}
                </span>
              </div>

              {(product.brandName || product.storeName || product.sku) && (
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {product.brandName && (
                    <span>
                      Brand:{" "}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {product.brandName}
                      </strong>
                    </span>
                  )}
                  {product.storeName && (
                    <span>
                      Sold by{" "}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {product.storeName}
                      </strong>
                    </span>
                  )}
                  {product.sku && <span>SKU: {product.sku}</span>}
                </div>
              )}

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/70">
                <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                  <p className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    {formatPrice(sellingPrice)}
                  </p>
                  {discountPercent && originalPrice && (
                    <p className="pb-1 text-sm text-slate-400 line-through">
                      {formatPrice(originalPrice)}
                    </p>
                  )}
                </div>
                {savings > 0 && (
                  <p className="mt-1 text-xs font-semibold text-rose-600">
                    You save {formatPrice(savings)} on this item
                  </p>
                )}
              </div>

              <div
                className={`mt-5 flex items-center gap-2 text-sm font-bold ${product.inStock ? "text-[#006B2C] dark:text-[#00C83A]" : "text-rose-600"}`}
              >
                {product.inStock ? (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#DDFBE5] dark:bg-[#063D1E]">
                    <Check size={15} />
                  </span>
                ) : (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-100 dark:bg-rose-950">
                    <X size={15} />
                  </span>
                )}
                {stockLabel}
              </div>

              {product.shortDescription && (
                <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {product.shortDescription}
                </p>
              )}

              {product.inStock && (
                <div className="mt-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Quantity
                    </p>
                    <div
                      className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950"
                      aria-label="Quantity selector"
                    >
                      <button
                        type="button"
                        onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                        disabled={quantity <= 1}
                        className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-10 text-center text-sm font-bold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}
                        disabled={quantity >= product.stock}
                        className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  {product.stockStatus === "LOW_STOCK" && (
                    <p className="max-w-32 text-right text-xs leading-5 text-amber-700 dark:text-amber-400">
                      Popular item — limited availability
                    </p>
                  )}
                </div>
              )}

              <div id="product-actions" className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleAddToCart}
                  disabled={sabbathClosed || !product.inStock}
                  className="h-12 rounded-xl border-[#009933] text-sm font-bold text-[#006B2C] hover:bg-[#EFFCF3] hover:text-[#004D20] disabled:cursor-not-allowed dark:text-[#00C83A]"
                >
                  <ShoppingCart size={18} />
                  {product.inStock ? "Add to cart" : "Out of stock"}
                </Button>
                <Button
                  size="lg"
                  onClick={handleBuyNow}
                  disabled={sabbathClosed || !product.inStock}
                  className="h-12 gap-2 rounded-xl bg-[#009933] text-sm font-bold hover:bg-[#006B2C] disabled:cursor-not-allowed"
                >
                  <CreditCard size={18} /> Buy now
                </Button>
              </div>

              <div className="mt-1">
                <WishlistPlanner productId={product.id} productName={product.name} />
              </div>
            </section>

            <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {[
                {
                  icon: Truck,
                  title: "Reliable delivery",
                  text: "Delivery details are confirmed with your order.",
                },
                {
                  icon: ShieldCheck,
                  title: "Buyer support",
                  text: "Help is available before and after purchase.",
                },
                {
                  icon: PackageCheck,
                  title: "Easy order tracking",
                  text: "Follow every update from your profile.",
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className={`flex gap-3 p-4 ${index ? "border-t border-slate-100 dark:border-slate-800" : ""}`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EFFCF3] text-[#006B2C] dark:bg-[#063D1E] dark:text-[#00C83A]">
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
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#006B2C] dark:text-[#00C83A]">
                Good to know
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">Product details</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Everything you need to make a confident choice.
              </p>
            </div>
            <div className="prose prose-slate max-w-none text-sm leading-7 text-slate-700 dark:text-slate-300">
              <ExpandableDescription text={productDescription} />
            </div>
          </div>
        </section>

        <section id="reviews" className="mt-10 scroll-mt-24 lg:mt-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#006B2C] dark:text-[#00C83A]">
                Customer feedback
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Reviews from verified buyers
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {reviewTotal
                ? `${reviewTotal} review${reviewTotal === 1 ? "" : "s"}`
                : "Be the first to review"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <RatingBreakdown summary={reviewSummary} />
          </div>

          {reviews.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#DDFBE5] font-bold text-[#006B2C] dark:bg-[#063D1E] dark:text-[#B8F5C8]">
                      {review.userName.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold">{review.userName}</h3>
                      <p className="text-[11px] text-[#006B2C] dark:text-[#00C83A]">
                        Verified purchase
                      </p>
                    </div>
                  </div>
                  <RatingStars
                    summary={{ average: review.rating, count: 1 }}
                    showValue={false}
                    showCount={false}
                    className="mt-4"
                  />
                  {review.message && (
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {review.message}
                    </p>
                  )}
                  {reviewDate(review.createdAt) && (
                    <p className="mt-4 text-xs text-slate-400">{reviewDate(review.createdAt)}</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
              No approved reviews yet.
            </div>
          )}
        </section>

        {recommendations.length > 0 && (
          <section className="mt-10 lg:mt-14">
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#006B2C] dark:text-[#00C83A]">
                  Keep exploring
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">You may also like</h2>
              </div>
              <Link
                href="/shop"
                className="hidden items-center gap-1 text-sm font-bold text-[#006B2C] sm:inline-flex"
              >
                Shop all <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {recommendations.map((item) => {
                const itemDiscount = getDiscountPercent(item);
                const itemOriginal = getOriginalPrice(item);
                const itemPrice = getSellingPrice(item);
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
                        className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                      {itemDiscount && (
                        <span className="absolute right-2 top-2 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-bold text-white">
                          -{itemDiscount}%
                        </span>
                      )}
                    </div>
                    <div className="p-3 sm:p-4">
                      <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">
                        {item.name}
                      </h3>
                      {itemDiscount && itemOriginal && (
                        <p className="mt-2 text-[10px] text-slate-400 line-through">
                          {formatPrice(itemOriginal)}
                        </p>
                      )}
                      <p className={`${itemDiscount ? "" : "mt-2"} text-sm font-extrabold`}>
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
            onClick={handleAddToCart}
            disabled={sabbathClosed || !product.inStock}
            className="h-12 flex-1 gap-2 rounded-xl border-[#009933] p-0 text-sm font-bold text-[#006B2C] dark:text-[#00C83A]"
          >
            <ShoppingCart size={18} /> Add to cart
          </Button>
          <Button
            size="lg"
            onClick={handleBuyNow}
            disabled={sabbathClosed || !product.inStock}
            className="h-12 flex-1 gap-2 rounded-xl bg-[#009933] p-0 text-sm font-bold hover:bg-[#006B2C]"
          >
            <CreditCard size={18} /> Buy now
          </Button>
        </div>
      </div>
    </main>
  );
}

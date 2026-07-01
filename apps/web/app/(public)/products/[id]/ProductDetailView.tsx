"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { CheckCircle2, ChevronRight, CreditCard, Heart, PackageCheck, ShieldCheck, ShoppingCart, Star, Truck, X } from "lucide-react";

import { formatPrice } from "@/lib/formatPrice";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { getDiscountPercent, getOriginalPrice, getSellingPrice } from "@/lib/pricing";
import FormattedDescription from "@/components/ui/FormattedDescription";
import { useSabbathStatus } from "@/lib/useSabbathStatus";
import { catalogApi, reviewsApi } from "@/lib/api";
import { toProductCardVM, type ProductCardVM, type ProductDetailVM } from "@/lib/view/catalog";

interface Review {
  id: string;
  userName: string;
  message: string;
  createdAt?: string;
}

function reviewDate(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).toLocaleDateString();
  }
  return "";
}

function getShortDescription(text: string, words = 60): string {
  const parts = text.split(" ");
  if (parts.length <= words) return text;
  return parts.slice(0, words).join(" ") + "...";
}

/**
 * Interactive product detail UI. All catalog data arrives as props from the
 * server component; only cart actions, the image gallery, the description modal
 * and (user-specific) reviews are handled on the client.
 */
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
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [recommendations, setRecommendations] = useState<ProductCardVM[]>(related);

  useEffect(() => {
    let cancelled = false;
    // Approved reviews for this product come from the Express API. The DTO
    // exposes the body as `comment`; this view renders it as `message`.
    reviewsApi
      .listForProduct(product.id)
      .then((page) => {
        if (cancelled) return;
        setReviews(
          page.items.map((rv) => ({
            id: rv.id,
            userName: rv.userName ?? "Anonymous",
            message: rv.comment ?? "",
            createdAt: rv.createdAt,
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
    let sessionId = localStorage.getItem("nurushop-view-session");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem("nurushop-view-session", sessionId);
    }
    void catalogApi.recordProductView(product.id, sessionId).catch(() => undefined);
    let cancelled = false;
    catalogApi
      .recommendProducts({ productId: product.id, limit: 8 })
      .then(({ products }) => {
        if (!cancelled && products.length > 0) {
          setRecommendations(products.map(toProductCardVM));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const handleAddToCart = () => {
    if (sabbathClosed || !product.inStock) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: getSellingPrice(product),
      quantity: 1,
      image: mainImage,
    });
  };

  const discountPercent = getDiscountPercent(product);
  const originalPrice = getOriginalPrice(product);
  const sellingPrice = getSellingPrice(product);
  const productDescription =
    product.description?.trim() ||
    product.shortDescription?.trim() ||
    "No description available for this product yet.";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-24 dark:bg-gray-950">
      <div className="mx-auto mb-5 flex max-w-7xl items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/shop" className="hover:text-blue-700 dark:hover:text-blue-300">
          Shop
        </Link>
        <ChevronRight size={14} />
        {product.categoryName && (
          <>
            <Link
              href={`/shop?category=${encodeURIComponent(product.categorySlug ?? "")}`}
              className="hover:text-blue-700 dark:hover:text-blue-300"
            >
              {product.categoryName}
            </Link>
            <ChevronRight size={14} />
          </>
        )}
        <span className="line-clamp-1 text-slate-700 dark:text-slate-200">{product.name}</span>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section>
          <div className="relative h-[360px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-gray-900 sm:h-[520px]">
            <Image src={mainImage} alt={product.name} fill className="object-contain p-5 sm:p-8" priority />
            {discountPercent && (
              <span className="absolute left-4 top-4 rounded-md bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                Save {discountPercent}%
              </span>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setMainImage(img)}
                  aria-label={`View image ${i + 1}`}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-white dark:bg-gray-900 ${
                    mainImage === img ? "border-blue-600 ring-2 ring-blue-500" : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-gray-900 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <ShieldCheck size={14} />
                Verified product
              </span>
              {product.isNew && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  New arrival
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl">
              {product.name}
            </h1>

            <div className="mt-3 flex items-center gap-2 text-sm text-amber-500">
              {[...Array(5)].map((_, idx) => (
                <Star key={idx} size={16} fill="currentColor" />
              ))}
              <span className="text-slate-500 dark:text-slate-400">
                {reviews.length > 0 ? `${reviews.length} reviews` : "Customer favorite"}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-3">
            {discountPercent && originalPrice && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
            <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
              {formatPrice(sellingPrice)}
            </div>
            {discountPercent && (
              <span className="rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-white">
                {discountPercent}% OFF
              </span>
            )}
            </div>

            <p className={`mt-4 inline-flex items-center gap-2 text-sm font-bold ${product.inStock ? "text-green-700" : "text-red-600"}`}>
              {product.inStock ? <CheckCircle2 size={17} /> : <X size={17} />}
              {product.inStock ? "In stock and ready to order" : "Out of stock - ordering is disabled"}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                variant="outline"
                onClick={handleAddToCart}
                disabled={sabbathClosed || !product.inStock}
                className="h-12 gap-2 disabled:cursor-not-allowed"
                title={
                  !product.inStock
                    ? "Out of stock"
                    : sabbathClosed
                    ? "Shopping is paused for Sabbath"
                    : "Add to cart"
                }
              >
                <ShoppingCart size={18} />
                {product.inStock ? "Add to cart" : "Out of stock"}
              </Button>

              <Button
                size="lg"
                disabled={sabbathClosed || !product.inStock}
                className="h-12 gap-2 bg-orange-500 hover:bg-orange-600 disabled:cursor-not-allowed"
                title={
                  !product.inStock
                    ? "Out of stock"
                    : sabbathClosed
                    ? "Shopping is paused for Sabbath"
                    : "Buy now"
                }
                onClick={() => router.push("/checkout" as Route)}
              >
                <CreditCard size={18} />
                Buy now
              </Button>
            </div>

            <button className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300">
              <Heart size={17} />
              Save for later
            </button>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-gray-900">
            <h2 className="mb-3 text-lg font-bold text-slate-950 dark:text-white">Product details</h2>
            <div className="leading-relaxed text-slate-700 dark:text-slate-300">
              <p>{getShortDescription(productDescription)}</p>
              {productDescription.split(" ").length > 60 && (
                <button
                  onClick={() => setIsDescriptionOpen(true)}
                  className="mt-3 text-sm font-bold text-blue-600 hover:underline"
                >
                  Read full description
                </button>
              )}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Truck, title: "Fast delivery", text: "Delivery options confirmed after order." },
              { icon: ShieldCheck, title: "Buyer support", text: "Help available before and after purchase." },
              { icon: PackageCheck, title: "Order tracking", text: "Track your purchase from your profile." },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-gray-900"
              >
                <item.icon className="mb-2 text-blue-700 dark:text-blue-400" size={20} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.text}</p>
              </div>
            ))}
          </section>
        </aside>
      </div>

      {reviews.length > 0 && (
        <section className="max-w-6xl mx-auto mt-16 px-4 sm:px-6">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
              What clients say about this product
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Real experiences from {reviews.length} customers
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {r.userName.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{r.userName}</h3>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{r.message}</p>
                <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                  {reviewDate(r.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {recommendations.length > 0 && (
        <section className="max-w-6xl mx-auto mt-16">
          <h2 className="text-xl font-semibold mb-6">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 sm:gap-6">
            {recommendations.map((rel) => {
              const relDiscount = getDiscountPercent(rel);
              const relOriginal = getOriginalPrice(rel);
              const relSelling = getSellingPrice(rel);
              return (
                <Link
                  key={rel.id}
                  href={rel.href as Route}
                  className="relative rounded-lg border border-slate-200 bg-white p-3 transition hover:shadow-md dark:border-slate-800 dark:bg-gray-900"
                >
                  {relDiscount && (
                    <div className="absolute right-2 top-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      {relDiscount}% OFF
                    </div>
                  )}
                  {rel.isNew && (
                    <div className="absolute left-2 top-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      NEW
                    </div>
                  )}
                  <div className="relative w-full h-40 rounded overflow-hidden">
                    <Image src={rel.image} alt={rel.name} fill className="object-contain p-2" />
                  </div>
                  <h3 className="mt-2 font-medium text-sm">{rel.name}</h3>
                  <div className="mt-1">
                    {relDiscount && relOriginal && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatPrice(relOriginal)}
                      </span>
                    )}
                    <p className="text-blue-600 font-semibold text-sm">{formatPrice(relSelling)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {isDescriptionOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {product.name} - Description
              </h3>
              <button
                onClick={() => setIsDescriptionOpen(false)}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                <FormattedDescription text={productDescription} />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

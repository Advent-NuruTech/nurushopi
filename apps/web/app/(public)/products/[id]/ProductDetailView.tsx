"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { formatPrice } from "@/lib/formatPrice";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { getDiscountPercent, getOriginalPrice, getSellingPrice } from "@/lib/pricing";
import FormattedDescription from "@/components/ui/FormattedDescription";
import { useSabbathStatus } from "@/lib/useSabbathStatus";
import { reviewsApi } from "@/lib/api";
import type { ProductCardVM, ProductDetailVM } from "@/lib/view/catalog";

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

  const handleAddToCart = () => {
    if (sabbathClosed) return;
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
    <main className="min-h-screen bg-white dark:bg-gray-900 py-20 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        <section>
          <div className="relative w-full h-[420px] rounded-lg overflow-hidden shadow-md bg-white dark:bg-gray-800">
            <Image src={mainImage} alt={product.name} fill className="object-contain p-4" priority />
          </div>

          {product.images.length > 1 && (
            <div className="flex gap-3 mt-4 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setMainImage(img)}
                  aria-label={`View image ${i + 1}`}
                  className={`relative w-20 h-20 border rounded-md overflow-hidden ${
                    mainImage === img ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <Image src={img} alt="" fill className="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="flex items-end gap-3">
            {discountPercent && originalPrice && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {formatPrice(sellingPrice)}
            </div>
            {discountPercent && (
              <span className="px-2 py-1 rounded-full bg-red-600 text-white text-xs font-semibold">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              size="lg"
              variant="outline"
              onClick={handleAddToCart}
              disabled={sabbathClosed}
              className="disabled:cursor-not-allowed"
              title={sabbathClosed ? "Shopping is paused for Sabbath" : "Add to cart"}
            >
              Add to Cart
            </Button>

            <Button
              size="lg"
              disabled={sabbathClosed}
              className="disabled:cursor-not-allowed"
              title={sabbathClosed ? "Shopping is paused for Sabbath" : "Buy now"}
              onClick={() => router.push("/checkout" as Route)}
            >
              Buy Now
            </Button>
          </div>

          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
          </div>

          <section className="pt-6 border-t">
            <h2 className="font-semibold text-lg mb-3">Product Details</h2>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 leading-relaxed text-slate-700 dark:text-slate-300">
              <p>{getShortDescription(productDescription)}</p>
              {productDescription.split(" ").length > 60 && (
                <button
                  onClick={() => setIsDescriptionOpen(true)}
                  className="mt-3 text-blue-600 font-medium hover:underline"
                >
                  Read full description
                </button>
              )}
            </div>
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
                className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-300">
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

      {related.length > 0 && (
        <section className="max-w-6xl mx-auto mt-16">
          <h2 className="text-xl font-semibold mb-6">Related Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {related.map((rel) => {
              const relDiscount = getDiscountPercent(rel);
              const relOriginal = getOriginalPrice(rel);
              const relSelling = getSellingPrice(rel);
              return (
                <Link
                  key={rel.id}
                  href={rel.href as Route}
                  className="relative border rounded-md p-3 hover:shadow-md transition"
                >
                  {relDiscount && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      {relDiscount}% OFF
                    </div>
                  )}
                  {rel.isNew && (
                    <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
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
          <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden">
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

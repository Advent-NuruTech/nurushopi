"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { formatPrice } from "@/lib/formatPrice";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import FormattedDescription from "@/components/ui/FormattedDescription";
import { useSabbathStatus } from "@/lib/useSabbathStatus";
import type { WholesaleCardVM } from "@/lib/view/catalog";

function getShortDescription(text: string, words = 60): string {
  const parts = text.split(" ");
  if (parts.length <= words) return text;
  return parts.slice(0, words).join(" ") + "...";
}

export default function WholesaleDetailView({
  product,
  related,
}: {
  product: WholesaleCardVM;
  related: WholesaleCardVM[];
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { isClosed: sabbathClosed } = useSabbathStatus();

  const [mainImage, setMainImage] = useState(product.images[0]);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  const minQty = product.minQuantity > 0 ? product.minQuantity : 1;
  const inStock = product.inStock && product.stock >= minQty;

  const handleAddToCart = () => {
    if (sabbathClosed || !inStock) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: product.unitPrice,
      quantity: minQty,
      image: mainImage,
      mode: "wholesale",
    });
  };

  const productDescription =
    product.description?.trim() || "No description available for this product yet.";

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
          <div className="flex items-end gap-3 flex-wrap">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {formatPrice(product.unitPrice)}
            </div>
            <span className="px-2 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold uppercase">
              Wholesale
            </span>
          </div>

          <div className="flex gap-3">
            <Button
              size="lg"
              variant="outline"
              onClick={handleAddToCart}
              disabled={sabbathClosed || !inStock}
              className="disabled:cursor-not-allowed"
              title={
                !inStock
                  ? "Out of stock"
                  : sabbathClosed
                  ? "Shopping is paused for Sabbath"
                  : "Add to cart"
              }
            >
              {inStock ? "Add to Cart" : "Out of Stock"}
            </Button>
            <Button
              size="lg"
              onClick={() => router.push("/checkout" as Route)}
              disabled={sabbathClosed || !inStock}
              className="disabled:cursor-not-allowed"
              title={
                !inStock
                  ? "Out of stock"
                  : sabbathClosed
                  ? "Shopping is paused for Sabbath"
                  : "Buy now"
              }
            >
              Buy Now
            </Button>
          </div>

          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
          </div>

          <div className="rounded-lg border bg-slate-50 dark:bg-slate-800 p-4 space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Minimum order:{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{minQty} unit</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Price per unit:{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatPrice(product.unitPrice)}
              </span>
            </p>
            <p className={`text-sm font-semibold ${inStock ? "text-green-700" : "text-red-600"}`}>
              {inStock ? `${product.stock} units in stock` : "Out of stock - ordering is disabled"}
            </p>
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

      {related.length > 0 && (
        <section className="max-w-6xl mx-auto mt-16">
          <h2 className="text-xl font-semibold mb-6">Related Wholesale Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {related.map((rel) => (
              <Link
                key={rel.id}
                href={rel.href}
                className="relative border rounded-md p-3 hover:shadow-md transition"
              >
                <div className="relative w-full h-40 rounded overflow-hidden">
                  <Image src={rel.image} alt={rel.name} fill className="object-contain p-2" />
                </div>
                <h3 className="mt-2 font-medium text-sm">{rel.name}</h3>
                <p className="text-blue-600 font-semibold text-sm mt-1">
                  {formatPrice(rel.unitPrice)} / unit
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Min: {rel.minQuantity > 0 ? rel.minQuantity : 1} unit
                </p>
              </Link>
            ))}
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

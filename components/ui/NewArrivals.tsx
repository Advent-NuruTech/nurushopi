"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { formatPrice } from "@/lib/formatPrice";
import { getDiscountPercent, getOriginalPrice, getSellingPrice } from "@/lib/pricing";
import SectionHeader from "@/components/ui/SectionHeader";
import ProductCardSkeleton from "@/components/ui/ProductCardSkeleton";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  sellingPrice?: number;
  image: string | null;
  createdAtMs: number;
}

interface ProductDoc {
  name?: string;
  price?: number;
  sellingPrice?: number;
  originalPrice?: number;
  images?: string[];
  image?: string;
  imageURL?: string;
  mode?: string;
  createdAt?: Timestamp | { seconds?: number } | string | number | null;
}

const FETCH_LIMIT = 24;
const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function toMillis(value: ProductDoc["createdAt"]): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "object" && typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  return 0;
}

export default function NewArrivals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(
          query(collection(db, "products"), orderBy("createdAt", "desc"), limit(FETCH_LIMIT))
        );

        const now = Date.now();
        const mapped = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as ProductDoc;
            if ((data.mode ?? "") === "wholesale") return null;

            const createdAtMs = toMillis(data.createdAt);
            if (!createdAtMs || now - createdAtMs > NEW_WINDOW_MS) return null;

            const image =
              Array.isArray(data.images) && data.images.length > 0
                ? data.images[0]
                : typeof data.image === "string" && data.image.trim().length > 5
                ? data.image.trim()
                : typeof data.imageURL === "string" && data.imageURL.trim().length > 5
                ? data.imageURL.trim()
                : null;

            const sellingPrice = Number(data.sellingPrice ?? data.price ?? 0);
            const originalPrice =
              typeof data.originalPrice === "number" && Number.isFinite(data.originalPrice)
                ? data.originalPrice
                : undefined;

            return {
              id: docSnap.id,
              name: String(data.name ?? "Product"),
              price: sellingPrice,
              sellingPrice,
              originalPrice,
              image,
              createdAtMs,
            } as Product;
          })
          .filter((item): item is Product => Boolean(item))
          .sort((a, b) => b.createdAtMs - a.createdAtMs);

        if (!cancelled) setProducts(mapped);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasProducts = useMemo(() => products.length > 0, [products]);

  if (!loading && !hasProducts) {
    return null;
  }

  return (
    <section className="w-full py-1 bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-0 sm:px-2">
        <div className="mb-2 px-0">
          <SectionHeader
            title="New Arrivals"
            href="/new-arrivals"
            showViewAll={!loading && products.length >= 8}
          />
        </div>

        {loading ? (
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="min-w-[140px] sm:min-w-[170px] lg:min-w-[190px] shrink-0">
                <ProductCardSkeleton className="rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {products.slice(0, 12).map((product) => {
              const discountPercent = getDiscountPercent(product);
              const originalPrice = getOriginalPrice(product);
              const sellingPrice = getSellingPrice(product);

              return (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  className="min-w-[140px] sm:min-w-[170px] lg:min-w-[190px] shrink-0 snap-start"
                >
                  <Link
                    href={`/products/${product.id}`}
                    className="group relative block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 overflow-hidden"
                  >
                    {discountPercent && (
                      <div className="absolute top-1 right-1 z-10 bg-red-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                        {discountPercent}% OFF
                      </div>
                    )}
                    <div className="absolute top-1 left-1 z-10 bg-green-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      NEW
                    </div>

                    <div className="relative aspect-square bg-white dark:bg-gray-800">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-contain p-1"
                          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-[10px] text-gray-400">No image</div>
                      )}
                    </div>

                    <div className="p-1.5">
                      <h3 className="text-[11px] sm:text-xs font-semibold line-clamp-2 leading-tight text-slate-800 dark:text-slate-100">
                        {product.name}
                      </h3>
                      <div className="mt-1">
                        {discountPercent && originalPrice && (
                          <p className="text-[10px] text-slate-400 line-through leading-none">
                            {formatPrice(originalPrice)}
                          </p>
                        )}
                        <p className="text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 leading-none">
                          {formatPrice(sellingPrice)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}

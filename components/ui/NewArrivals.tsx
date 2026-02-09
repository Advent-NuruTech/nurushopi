"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { formatPrice } from "@/lib/formatPrice";
import { getDiscountPercent, getOriginalPrice, getSellingPrice } from "@/lib/pricing";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  sellingPrice?: number;
  image: string | null;
}

interface ProductDoc {
  name: string;
  price: number;
  sellingPrice?: number;
  originalPrice?: number;
  images?: string[];
  image?: string;
  imageURL?: string;
}

const PAGE_SIZE = 5;
const ROTATION_INTERVAL = 10 * 60 * 1000; // 10 minutes

export default function NewArrivals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  /* ---------------- FETCH PRODUCTS ---------------- */
  const fetchProducts = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    const q = lastDoc
      ? query(
          collection(db, "products"),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        )
      : query(
          collection(db, "products"),
          orderBy("createdAt", "desc"),
          limit(PAGE_SIZE)
        );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const fetched: Product[] = snapshot.docs.map((doc) => {
        const d = doc.data() as ProductDoc;

        const image =
          Array.isArray(d.images) && d.images.length > 0
            ? d.images[0]
            : typeof d.image === "string" && d.image.trim().length > 5
            ? d.image.trim()
            : typeof d.imageURL === "string" && d.imageURL.trim().length > 5
            ? d.imageURL.trim()
            : null;

        const sellingPrice = Number(d.sellingPrice ?? d.price ?? 0);
        const originalPriceValue = d.originalPrice;
        const originalPrice =
          typeof originalPriceValue === "number" && Number.isFinite(originalPriceValue)
            ? originalPriceValue
            : undefined;
        return {
          id: doc.id,
          name: d.name,
          price: sellingPrice,
          sellingPrice,
          originalPrice,
          image,
        };
      });

      setProducts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        fetched.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    }

    setLoading(false);
  }, [lastDoc, loading]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* ---------------- ROTATING START INDEX ---------------- */
  const rotatedProducts = useMemo(() => {
    if (products.length === 0) return [];

    const rotationIndex =
      Math.floor(Date.now() / ROTATION_INTERVAL) % products.length;

    return [
      ...products.slice(rotationIndex),
      ...products.slice(0, rotationIndex),
    ];
  }, [products]);

  /* ---------------- SCROLL ---------------- */
  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;

    const el = scrollRef.current;
    const amount = 320;

    el.scrollBy({
      left: dir === "right" ? amount : -amount,
      behavior: "smooth",
    });

    // Infinite fetch while scrolling right
    if (
      dir === "right" &&
      el.scrollLeft + el.clientWidth >= el.scrollWidth - 50
    ) {
      fetchProducts();
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <section className="w-full py-1 bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-0 sm:px-6">
        {/* Premium E-commerce Title */}
        <div className="relative">
          {/* Left Scroll Button */}
          <button
            onClick={() => scroll("left")}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-900 p-3 rounded-full shadow-lg hover:scale-105 transition"
          >
            &#10094;
          </button>

          {/* Product Scroll Container */}
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto scroll-smooth px-10 pb-4"
          >
            {rotatedProducts.map((product) => {
              const discountPercent = getDiscountPercent(product);
              const originalPrice = getOriginalPrice(product);
              const sellingPrice = getSellingPrice(product);
              return (
                <motion.div
                  key={product.id}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="relative min-w-[240px] bg-white dark:bg-gray-900 rounded-2xl shadow-md hover:shadow-xl flex-shrink-0 overflow-hidden"
                >
                  {discountPercent && (
                    <div className="absolute top-2 right-2 z-10 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      {discountPercent}% OFF
                    </div>
                  )}
                  <Link href={`/products/${product.id}`}>
                    <div className="relative w-full h-52 bg-white dark:bg-gray-800">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-contain p-4"
                          sizes="240px"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-gray-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="p-4 text-center">
                      <h3 className="font-semibold text-sm line-clamp-1">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex flex-col items-center">
                        {discountPercent && originalPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(originalPrice)}
                          </span>
                        )}
                        <span className="text-blue-600 font-bold text-sm">
                          {formatPrice(sellingPrice)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}

            {loading && (
              <div className="min-w-[240px] flex items-center justify-center text-gray-400">
                Loading…
              </div>
            )}
          </div>

          {/* Right Scroll Button */}
          <button
            onClick={() => scroll("right")}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-900 p-3 rounded-full shadow-lg hover:scale-105 transition"
          >
            &#10095;
          </button>
        </div>
      </div>
    </section>
  );
}

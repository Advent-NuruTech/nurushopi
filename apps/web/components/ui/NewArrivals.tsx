"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/formatPrice";
import { getDiscountPercent, getOriginalPrice, getSellingPrice } from "@/lib/pricing";
import type { ProductCardVM } from "@/lib/view/catalog";
import SectionHeader from "@/components/ui/SectionHeader";

/**
 * Presentational "New Arrivals" rail.
 *
 * Data is fetched on the server (see `lib/data/catalog#listNewArrivals`) and
 * passed in as props, so this component carries no data-fetching concerns and
 * renders instantly with no client-side loading flash.
 */
export default function NewArrivals({ products }: { products: ProductCardVM[] }) {
  if (products.length === 0) return null;

  return (
    <section className="w-full py-1 bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-0 sm:px-2">
        <div className="mb-2 px-0">
          <SectionHeader
            title="New Arrivals"
            href="/new-arrivals"
            showViewAll={products.length >= 8}
          />
        </div>

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
                  href={product.href}
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
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-contain p-1"
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
                    />
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
      </div>
    </section>
  );
}

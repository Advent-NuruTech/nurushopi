"use client";

import React from "react";
import ProductCard from "@/components/ui/ProductCard";
import { Product } from "@/lib/types";

interface ProductGridProps {
  products: Product[];
  title?: string;
  subtitle?: string;
}

export default function ProductGrid({ products, title, subtitle }: ProductGridProps) {
  return (
    <section className="py-8 px-3 sm:px-6 lg:px-10">
      {/* Title */}
      {title && (
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-center text-gray-800 dark:text-gray-100 tracking-tight">
          {title}
        </h2>
      )}

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-1 mb-6 text-center text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}

      {/* Product List */}
   {!products || products.length === 0 ? (
  <p className="text-center text-gray-500 dark:text-gray-400">
    No products available in this category yet.
  </p>
      ) : (
        <div
          className="
            grid
            grid-cols-2
            sm:grid-cols-2
            md:grid-cols-3
            lg:grid-cols-4
            gap-4 sm:gap-6
            justify-center
            items-stretch
          "
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                ...product,
                images: product.images?.slice(0, 1) || [],
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

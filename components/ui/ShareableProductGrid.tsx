"use client";

import { Product } from "@/lib/types";
import ShareableProductCard from "./ShareableProductCard";

interface ShareableProductGridProps {
  products: Product[];
  title: string;
  subtitle?: string;
}

export default function ShareableProductGrid({
  products,
  title,
  subtitle,
}: ShareableProductGridProps) {
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">{subtitle}</p>}
      </div>
      <div className="mt-10 max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {products.map((product) => (
          <ShareableProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
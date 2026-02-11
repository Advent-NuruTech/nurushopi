"use client";

import { useEffect, useState } from "react";
import WholesaleGrid from "@/components/wholesale/WholesaleGrid";
import SectionHeader from "@/components/ui/SectionHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function WholesellerPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wholesale")
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-16 px-0 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-4">
        <SectionHeader
          title="Wholesale Products"
          href="/shop"
          viewText="Shop Retail"
        />
      </div>

      <p className="mb-6 text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto md:mx-0 leading-relaxed text-center md:text-left">
        Buy in bulk with wholesale pricing. Minimum order quantities apply.
      </p>

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <WholesaleGrid products={products} />
      )}
    </div>
  );
}

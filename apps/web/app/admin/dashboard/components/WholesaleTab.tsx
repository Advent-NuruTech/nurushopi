"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/formatPrice";
import { ADMIN_DASHBOARD_PATH, adminRoute } from "@/lib/adminPaths";
import { wholesaleApi } from "@/lib/api";
import type { WholesaleItemDTO } from "@nuru/types";

export default function WholesaleTab() {
  const [products, setProducts] = useState<WholesaleItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    wholesaleApi.admin
      .listItems({ pageSize: 100 })
      .then((page) => setProducts(page.items))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const id = p.id.toLowerCase();
      const name = String(p.name ?? "").toLowerCase();
      return id.includes(q) || name.includes(q);
    });
  }, [products, productSearch]);

  if (loading) return <LoadingSpinner text="Loading wholesale..." />;

  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Wholesale Products
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage wholesale pricing and quantities. Total: {products.length} | Showing: {filteredProducts.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search wholesale..."
              className="w-56 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <Link
              href={adminRoute(`${ADMIN_DASHBOARD_PATH}/wholesale/upload`)}
              className="bg-sky-600 text-white px-4 py-2 rounded"
            >
              Upload Wholesale Product
            </Link>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <p className="text-slate-500 text-center">
            {products.length === 0 ? "No wholesale products yet." : "No wholesale products match your search."}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.map((p) => (
              <Link
                key={p.id}
                href={adminRoute(`${ADMIN_DASHBOARD_PATH}/wholesale/${p.id}/edit`)}
                className="border rounded-xl overflow-hidden bg-white hover:shadow transition"
              >
                <div className="relative w-full h-40 bg-gray-100">
                  {p.images?.[0] && (
                    <Image
                      src={p.images[0]}
                      alt={p.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="p-4 space-y-1">
                  <h3 className="font-semibold line-clamp-1">{p.name}</h3>
                  <p className="text-sky-600 font-semibold">
                    {formatPrice(Number(p.unitPrice))}
                  </p>
                  <p className="text-sm text-gray-500">Min: {p.minQuantity} pcs</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

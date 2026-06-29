"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Image from "next/image";
import { ADMIN_DASHBOARD_PATH, adminRoute } from "@/lib/adminPaths";
import { formatPrice } from "@/lib/formatPrice";
import { wholesaleApi } from "@/lib/api";
import type { WholesaleItemDTO } from "@nuru/types";

export default function WholesaleAdminPage() {
  const [products, setProducts] = useState<WholesaleItemDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    wholesaleApi.admin
      .listItems({ pageSize: 100 })
      .then((page) => setProducts(page.items))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading wholesale products…" />
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Wholesale Products</h1>

        <Link
          href={adminRoute(`${ADMIN_DASHBOARD_PATH}/wholesale/upload`)}
          className="bg-sky-600 text-white px-4 py-2 rounded"
        >
          Upload Wholesale Product
        </Link>
      </div>

      {/* Empty */}
      {products.length === 0 && (
        <div className="bg-white border rounded p-8 text-center text-gray-500">
          No wholesale products yet.
        </div>
      )}

      {/* Grid */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {products.map((p) => (
          <Link
            key={p.id}
            href={adminRoute(`${ADMIN_DASHBOARD_PATH}/wholesale/${p.id}/edit`)}
            className="border rounded-xl overflow-hidden bg-white hover:shadow transition"
          >
            <div className="relative w-full h-40 bg-gray-100">
              {p.images?.[0] && (
                <Image src={p.images[0]} alt={p.name} fill className="object-cover" />
              )}
            </div>

            <div className="p-4 space-y-1">
              <h3 className="font-semibold line-clamp-1">{p.name}</h3>
              <p className="text-sky-600 font-semibold">{formatPrice(Number(p.unitPrice))}</p>
              <p className="text-sm text-gray-500">Min: {p.minQuantity} pcs</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

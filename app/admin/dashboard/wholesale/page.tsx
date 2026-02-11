"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Image from "next/image";

interface WholesaleProduct {
  id: string;
  name: string;
  wholesalePrice: number;
  wholesaleMinQty: number;
  wholesaleUnit?: string;
  images?: string[];
  stock?: number;
}

export default function WholesaleAdminPage() {
  const [products, setProducts] = useState<WholesaleProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/products?mode=wholesale", {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
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
        <h1 className="text-2xl font-bold">
          Wholesale Products
        </h1>

        <Link
          href="/admin/dashboard/wholesale/upload"
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
            href={`/admin/dashboard/wholesale/${p.id}/edit`}
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
              <h3 className="font-semibold line-clamp-1">
                {p.name}
              </h3>

              <p className="text-sky-600 font-semibold">
                KSh {p.wholesalePrice?.toLocaleString()}
              </p>

              <p className="text-sm text-gray-500">
                Min: {p.wholesaleMinQty}{" "}
                {p.wholesaleUnit ?? "pcs"}
              </p>

              {p.stock !== undefined && (
                <p className="text-xs text-gray-500">
                  Stock: {p.stock}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

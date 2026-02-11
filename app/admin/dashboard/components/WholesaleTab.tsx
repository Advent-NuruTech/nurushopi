"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/formatPrice";

type WholesaleProduct = {
  id: string;
  name: string;
  wholesalePrice: number;
  wholesaleMinQty: number;
  wholesaleUnit?: string;
  images?: string[];
};

type Order = {
  id: string;
  name: string;
  totalAmount: number;
  status: string;
  items?: { mode?: "wholesale" | "retail"; name?: string; quantity?: number }[];
};

export default function WholesaleTab() {
  const [products, setProducts] = useState<WholesaleProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products?mode=wholesale", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => d.products ?? []),
      fetch("/api/admin/orders", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => d.orders ?? []),
    ])
      .then(([productsData, ordersData]) => {
        setProducts(productsData);
        const wholesaleOrders = (ordersData as Order[]).filter((o) =>
          (o.items ?? []).some((it) => it.mode === "wholesale")
        );
        setOrders(wholesaleOrders);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner text="Loading wholesale..." />;

  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Wholesale Orders
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Orders that include wholesale items.
            </p>
          </div>
        </div>
        {orders.length === 0 ? (
          <p className="p-6 text-slate-500 text-center">No wholesale orders.</p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {orders.map((o) => (
              <div key={o.id} className="p-4 flex justify-between text-sm">
                <span>#{o.id.slice(0, 8)}</span>
                <span>{o.name}</span>
                <span>{formatPrice(o.totalAmount)}</span>
                <span className="capitalize">{o.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Wholesale Products
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage wholesale pricing and quantities.
            </p>
          </div>
          <Link
            href="/admin/dashboard/wholesale/upload"
            className="bg-sky-600 text-white px-4 py-2 rounded"
          >
            Upload Wholesale Product
          </Link>
        </div>

        {products.length === 0 ? (
          <p className="text-slate-500 text-center">No wholesale products yet.</p>
        ) : (
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
                  <h3 className="font-semibold line-clamp-1">{p.name}</h3>
                  <p className="text-sky-600 font-semibold">
                    {formatPrice(Number(p.wholesalePrice ?? 0))}
                  </p>
                  <p className="text-sm text-gray-500">
                    Min: {p.wholesaleMinQty} {p.wholesaleUnit ?? "pcs"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

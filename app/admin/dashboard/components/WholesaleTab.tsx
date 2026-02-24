"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  const [productSearch, setProductSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");

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
        const normalizedProducts = (productsData as Record<string, unknown>[]).map((p) => ({
          id: String(p.id ?? ""),
          name: String(p.name ?? "Wholesale product"),
          wholesalePrice: Number(
            p.wholesalePrice ?? p.sellingPrice ?? p.price ?? 0
          ),
          wholesaleMinQty: Number(p.wholesaleMinQty ?? 1),
          wholesaleUnit: String(p.wholesaleUnit ?? "pcs"),
          images: Array.isArray(p.images) ? (p.images as string[]) : [],
        }));
        setProducts(normalizedProducts);
        const wholesaleOrders = (ordersData as Order[]).filter((o) =>
          (o.items ?? []).some((it) => it.mode === "wholesale")
        );
        setOrders(wholesaleOrders);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const id = o.id.toLowerCase();
      const name = String(o.name ?? "").toLowerCase();
      const status = String(o.status ?? "").toLowerCase();
      return id.includes(q) || name.includes(q) || status.includes(q);
    });
  }, [orders, orderSearch]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const id = p.id.toLowerCase();
      const name = String(p.name ?? "").toLowerCase();
      const unit = String(p.wholesaleUnit ?? "").toLowerCase();
      return id.includes(q) || name.includes(q) || unit.includes(q);
    });
  }, [products, productSearch]);

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
              Orders that include wholesale items. Total: {orders.length} | Showing: {filteredOrders.length}
            </p>
          </div>
          <input
            type="text"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            placeholder="Search orders..."
            className="w-52 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </div>
        {filteredOrders.length === 0 ? (
          <p className="p-6 text-slate-500 text-center">
            {orders.length === 0 ? "No wholesale orders." : "No wholesale orders match your search."}
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredOrders.map((o) => (
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
              href="/admin/dashboard/wholesale/upload"
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

"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/formatPrice";
import { AdminRole } from "./types";

interface OrdersTabProps {
  adminId: string;
  role: AdminRole;
}

interface Order {
  id: string;
  name: string;
  totalAmount: number;
  status: string;
  cancellationReason?: string | null;
  createdAt: string;
  items?: {
    id?: string;
    productId?: string;
    name?: string;
    quantity?: number;
    price?: number;
    image?: string;
    mode?: "wholesale" | "retail";
  }[];
}

export default function OrdersTab({ role }: OrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("orderId");

  useEffect(() => {
    fetch("/api/admin/orders", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const row = document.getElementById(`order-${highlightId}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, orders]);

  const approve = async (orderId: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: "approved" }),
    });
    if (res.ok) setOrders((o) => o.map((x) => (x.id === orderId ? { ...x, status: "received" } : x)));
  };

  const markShipped = async (orderId: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: "shipped" }),
    });
    if (res.ok) setOrders((o) => o.map((x) => (x.id === orderId ? { ...x, status: "shipped" } : x)));
  };

  if (loading) return <LoadingSpinner text="Loading orders…" />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Orders</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {role === "sub" 
            ? "Orders that include your products. You can mark shipped only." 
            : "All orders. Senior Admin approves orders."}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-sm text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                id={`order-${o.id}`}
                className={`border-t border-slate-200 dark:border-slate-700 ${
                  highlightId === o.id
                    ? "bg-sky-50/70 dark:bg-sky-900/20"
                    : ""
                }`}
              >
                <td className="px-4 py-3 font-mono text-sm text-slate-700 dark:text-slate-300">
                  #{o.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3">
                  {!o.items?.length ? (
                    <span className="text-xs text-slate-400">No items</span>
                  ) : (
                    <div className="flex flex-col gap-2 min-w-[220px]">
                      {o.items.map((it, index) => {
                        const productId = it.productId || it.id;
                        const href = productId
                          ? it.mode === "wholesale"
                            ? `/wholeseller/${encodeURIComponent(productId)}`
                            : `/products/${encodeURIComponent(productId)}`
                          : "";
                        const imageSrc =
                          it.image || "/assets/logo.jpg";

                        return (
                          <div
                            key={`${productId ?? "item"}-${index}`}
                            className="flex items-center gap-3"
                          >
                            <div className="relative h-10 w-10 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                              <Image
                                src={imageSrc}
                                alt={it.name ?? "Product image"}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {it.name ?? "Product"}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                {productId ? (
                                  <Link
                                    href={href as Route}
                                    className="text-xs text-sky-600 dark:text-sky-400 hover:underline break-all"
                                  >
                                    {href}
                                  </Link>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    No product link
                                  </span>
                                )}
                                {typeof it.quantity === "number" && (
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    x{it.quantity}
                                  </span>
                                )}
                                {typeof it.price === "number" && (
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {formatPrice(it.price)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">{o.name}</td>
                <td className="px-4 py-3">{formatPrice(o.totalAmount)}</td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      o.status === "received" 
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" 
                        : o.status === "shipped"
                          ? "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300"
                          : o.status === "cancelled" 
                            ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" 
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    }`}>
                      {o.status === "received" ? "Approved" : o.status === "shipped" ? "Shipped" : o.status}
                    </span>
                    {o.status === "cancelled" && o.cancellationReason && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-[240px] break-words">
                        Reason: {o.cancellationReason}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {role === "sub" && (
                      <button
                        onClick={() => markShipped(o.id)}
                        disabled={o.status === "received" || o.status === "cancelled" || o.status === "shipped"}
                        className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm"
                      >
                        Mark Shipped
                      </button>
                    )}
                    <button
                      onClick={() => approve(o.id)}
                      disabled={role !== "senior" || o.status === "received" || o.status === "cancelled"}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm"
                    >
                      Approve
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {orders.length === 0 && (
        <p className="p-6 text-slate-500 dark:text-slate-400 text-center">No orders.</p>
      )}
    </section>
  );
}

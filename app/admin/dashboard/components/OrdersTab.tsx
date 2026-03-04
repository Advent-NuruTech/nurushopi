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

interface OrderItem {
  id?: string;
  productId?: string;
  name?: string;
  quantity?: number;
  price?: number;
  image?: string;
  mode?: "wholesale" | "retail";
}

interface Order {
  id: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  country?: string;
  county?: string;
  locality?: string;
  message?: string;
  totalAmount: number;
  status: string;
  cancellationReason?: string | null;
  createdAt: string;
  items: OrderItem[];
}

function formatLocation(order: Order): string {
  return [order.locality, order.county, order.country].filter(Boolean).join(", ");
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const classes =
    normalized === "received"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : normalized === "shipped"
        ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
        : normalized === "cancelled"
          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>
      {normalized === "received" ? "Approved" : status}
    </span>
  );
}

export default function OrdersTab({ role }: OrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("orderId");

  useEffect(() => {
    fetch("/api/admin/orders", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => setOrders(data.orders ?? []))
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
    if (res.ok) {
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? { ...order, status: "received" } : order))
      );
    }
  };

  const markShipped = async (orderId: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: "shipped" }),
    });
    if (res.ok) {
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? { ...order, status: "shipped" } : order))
      );
    }
  };

  if (loading) return <LoadingSpinner text="Loading orders..." />;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Orders</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {role === "senior"
            ? "Senior Admin view: full customer details, delivery data, and order activity."
            : "Sub Admin view: restricted customer data, product items, location, and fulfillment status."}
        </p>
      </div>

      {orders.length === 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center text-slate-500 dark:text-slate-400">
          No orders found.
        </div>
      )}

      {orders.map((order) => (
        <article
          key={order.id}
          id={`order-${order.id}`}
          className={`rounded-xl border p-4 bg-white dark:bg-slate-900 transition ${
            highlightId === order.id
              ? "border-sky-400 ring-2 ring-sky-200 dark:ring-sky-900/40"
              : "border-slate-200 dark:border-slate-700"
          }`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Order #{order.id.slice(0, 8)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Customer</p>
                <p className="font-medium text-slate-900 dark:text-white">{order.name || "Unknown customer"}</p>
                {role === "senior" && (
                  <div className="text-slate-600 dark:text-slate-300">
                    {order.email && <p>Email: {order.email}</p>}
                    {order.phone && <p>Phone: {order.phone}</p>}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Delivery location</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {formatLocation(order) || "Location not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Special message</p>
                <p className="text-slate-700 dark:text-slate-300">
                  {order.message?.trim() ? order.message : "No special message"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total amount</p>
                <p className="font-semibold text-slate-900 dark:text-white">{formatPrice(order.totalAmount)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Order items</p>
              <div className="space-y-2">
                {order.items?.length ? (
                  order.items.map((item, index) => {
                    const productId = item.productId || item.id;
                    const href = productId
                      ? item.mode === "wholesale"
                        ? `/wholeseller/${encodeURIComponent(productId)}`
                        : `/products/${encodeURIComponent(productId)}`
                      : null;

                    return (
                      <div key={`${productId ?? "item"}-${index}`} className="flex gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                        <div className="relative h-12 w-12 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                          <Image
                            src={item.image || "/assets/logo.jpg"}
                            alt={item.name || "Product"}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {item.name || "Product"}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            {href ? (
                              <Link href={href as Route} className="text-sky-600 dark:text-sky-400 hover:underline break-all">
                                {productId}
                              </Link>
                            ) : (
                              <span>No product id</span>
                            )}
                            {typeof item.quantity === "number" && <span>x{item.quantity}</span>}
                            {typeof item.price === "number" && <span>{formatPrice(item.price)}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No items</p>
                )}
              </div>
            </div>
          </div>

          {order.status === "cancelled" && order.cancellationReason && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400">
              Cancellation reason: {order.cancellationReason}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {role === "sub" && (
              <button
                onClick={() => markShipped(order.id)}
                disabled={order.status === "received" || order.status === "cancelled" || order.status === "shipped"}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm"
              >
                Mark Shipped
              </button>
            )}
            <button
              onClick={() => approve(order.id)}
              disabled={role !== "senior" || order.status === "received" || order.status === "cancelled"}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm"
            >
              Approve
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/formatPrice";
import { orderApi, ApiClientError } from "@/lib/api";
import type { OrderDTO, OrderStatus } from "@nuru/types";
import { AdminRole } from "./types";

interface OrdersTabProps {
  adminId: string;
  role: AdminRole;
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  PROCESSING: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  SHIPPED: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  DELIVERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  REFUNDED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export default function OrdersTab({ role }: OrdersTabProps) {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("orderId");

  useEffect(() => {
    orderApi.admin
      .list({ pageSize: 100 })
      .then((page) => setOrders(page.items))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const row = document.getElementById(`order-${highlightId}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, orders]);

  const setStatus = async (id: string, status: OrderStatus) => {
    try {
      const { order } = await orderApi.admin.updateStatus(id, status);
      setOrders((current) => current.map((o) => (o.id === id ? order : o)));
    } catch (err) {
      if (err instanceof ApiClientError) alert(err.message);
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
              <p className="font-semibold text-slate-900 dark:text-white">Order #{order.orderNumber}</p>
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
                <p className="font-medium text-slate-900 dark:text-white">
                  {order.contactName || "Unknown customer"}
                </p>
                {role === "senior" && (
                  <div className="text-slate-600 dark:text-slate-300">
                    {order.contactEmail && <p>Email: {order.contactEmail}</p>}
                    {order.contactPhone && <p>Phone: {order.contactPhone}</p>}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Delivery location</p>
                <p className="font-medium text-slate-900 dark:text-white">
                  {order.address || "Location not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Special message</p>
                <p className="text-slate-700 dark:text-slate-300">
                  {order.note?.trim() ? order.note : "No special message"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Total amount</p>
                <p className="font-semibold text-slate-900 dark:text-white">{formatPrice(Number(order.total))}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Order items</p>
              <div className="space-y-2">
                {order.items?.length ? (
                  order.items.map((item) => {
                    const href = item.productId
                      ? (`/products/${encodeURIComponent(item.productId)}` as Route)
                      : null;

                    return (
                      <div key={item.id} className="flex gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                        <div className="relative h-12 w-12 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                          <Image
                            src={item.imageUrl || "/assets/logo.jpg"}
                            alt={item.productName || "Product"}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {item.productName || "Product"}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            {href ? (
                              <Link href={href} className="text-sky-600 dark:text-sky-400 hover:underline break-all">
                                {item.productId}
                              </Link>
                            ) : (
                              <span>No product id</span>
                            )}
                            <span>x{item.quantity}</span>
                            <span>{formatPrice(Number(item.unitPrice))}</span>
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

          <div className="mt-4 flex flex-wrap gap-2">
            {role === "sub" && (
              <button
                onClick={() => setStatus(order.id, "SHIPPED")}
                disabled={order.status !== "CONFIRMED" && order.status !== "PROCESSING"}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm"
              >
                Mark Shipped
              </button>
            )}
            <button
              onClick={() => setStatus(order.id, "CONFIRMED")}
              disabled={role !== "senior" || order.status !== "PENDING"}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm"
            >
              Confirm
            </button>
            {role === "senior" && (
              <button
                onClick={() => setStatus(order.id, "CANCELLED")}
                disabled={order.status === "CANCELLED" || order.status === "DELIVERED" || order.status === "REFUNDED"}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}

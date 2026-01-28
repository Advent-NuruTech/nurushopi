"use client";

import React, { useEffect, useState } from "react";
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
  createdAt: string;
  items?: { name?: string; quantity?: number; price?: number }[];
}

export default function OrdersTab({ role }: OrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/orders", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  const approve = async (orderId: string) => {
    const res = await fetch("/api/admin/orders", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, status: "approved" }),
    });
    if (res.ok) setOrders((o) => o.map((x) => (x.id === orderId ? { ...x, status: "received" } : x)));
  };

  if (loading) return <LoadingSpinner text="Loading orders…" />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Orders</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {role === "sub" 
            ? "Orders that include your products." 
            : "All orders. Only Super Admin can approve."}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-sm text-slate-600 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              {role === "senior" && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-slate-200 dark:border-slate-700">
                <td className="px-4 py-3 font-mono text-sm text-slate-700 dark:text-slate-300">
                  #{o.id.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-slate-900 dark:text-white">{o.name}</td>
                <td className="px-4 py-3">{formatPrice(o.totalAmount)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    o.status === "received" 
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" 
                      : o.status === "cancelled" 
                        ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" 
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}>
                    {o.status === "received" ? "Approved" : o.status}
                  </span>
                </td>
                {role === "senior" && (
                  <td className="px-4 py-3">
                    {o.status !== "received" && o.status !== "cancelled" && (
                      <button
                        onClick={() => approve(o.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                      >
                        Approve
                      </button>
                    )}
                  </td>
                )}
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
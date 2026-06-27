"use client";

import React from "react";
import { Package, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/formatPrice";
import { statusLabel, statusBadgeClass } from "./orderUtils";
import type { ApiOrder, OrderStatusFilter } from "../types";

interface ManageOrdersProps {
  orders: ApiOrder[];
  ordersLoading: boolean;
  orderFilter: OrderStatusFilter;
  onFilterChange: (filter: OrderStatusFilter) => void;
  onViewDetails: (order: ApiOrder) => void;
}

export default function ManageOrders({
  orders,
  ordersLoading,
  orderFilter,
  onFilterChange,
  onViewDetails,
}: ManageOrdersProps) {
  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
      <div className="p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Package size={20} />
          Manage Orders
        </h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {(["all", "pending", "shipped", "received", "cancelled"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                orderFilter === filter
                  ? "bg-sky-600 text-white hover:bg-sky-700"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {filter === "all" ? "All" : statusLabel(filter)}
            </button>
          ))}
        </div>
        {ordersLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size={40} text="Loading orders…" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 py-8 text-center">
            No orders found.
          </p>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-sky-300 dark:hover:border-sky-600 transition-colors"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    Order #{order.id.slice(0, 8)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusBadgeClass(
                      order.status
                    )}`}
                  >
                    {order.status === "received" ? (
                      <CheckCircle2 size={14} className="mr-1" />
                    ) : order.status === "cancelled" ? (
                      <XCircle size={14} className="mr-1" />
                    ) : null}
                    {statusLabel(order.status)}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatPrice(order.totalAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onViewDetails(order)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    View details
                    <ChevronDown size={16} className="rotate-[-90deg]" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

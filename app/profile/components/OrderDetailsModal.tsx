"use client";

import React from "react";
import Link from "next/link";
import { X, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import { statusLabel, statusBadgeClass } from "./orderUtils";
// In OrderDetailsModal.tsx
import ReceiptDownloadButton from "./ReceiptDownloadButton";

import type { ApiOrder } from "../types";

interface OrderDetailsModalProps {
  order: ApiOrder | null;
  onClose: () => void;
}

export default function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  if (!order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-detail-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg my-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 id="order-detail-title" className="text-lg font-semibold text-slate-900 dark:text-white">
            Order #{order.id.slice(0, 8)}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Date</span>
            <span className="text-slate-900 dark:text-white">
              {new Date(order.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Status</span>
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${statusBadgeClass(
                order.status
              )}`}
            >
              {order.status === "received" ? (
                <CheckCircle2 size={12} className="mr-1" />
              ) : order.status === "cancelled" ? (
                <XCircle size={12} className="mr-1" />
              ) : null}
              {statusLabel(order.status)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Total</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
          {(order.locality || order.county || order.country) && (
            <div className="text-sm">
              <span className="text-slate-500 dark:text-slate-400">Address</span>
              <p className="text-slate-900 dark:text-white mt-1">
                {[order.locality, order.county, order.country].filter(Boolean).join(", ")}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Items</p>
            <ul className="space-y-2">
              {order.items?.map((item, index) => (
                <li
                  key={`${item.id}-${index}`}
                  className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <span className="text-slate-900 dark:text-white">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {formatPrice((item.price ?? 0) * (item.quantity ?? 1))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
  <Link
    href="/shop"
    className="inline-flex items-center gap-2 text-sky-600 dark:text-sky-400 font-medium hover:underline"
    onClick={onClose}
  >
    Continue shopping
    <ExternalLink size={16} />
  </Link>
  
  <ReceiptDownloadButton 
    order={order} 
    disabled={order.status !== "received"} 
  />
</div>
      </div>
    </div>
  );
}
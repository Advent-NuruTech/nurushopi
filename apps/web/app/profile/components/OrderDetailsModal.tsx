"use client";

import React, { useState } from "react";
import Link from "next/link";
import { X, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import { statusLabel, statusBadgeClass } from "./orderUtils";
import ReceiptDownloadButton from "./ReceiptDownloadButton";

import type { ApiOrder } from "../types";

interface OrderDetailsModalProps {
  order: ApiOrder | null;
  onClose: () => void;
  userId?: string | null;
  userName?: string;
  onOrderUpdated?: (orderId: string, status: string) => void;
}

export default function OrderDetailsModal({
  order,
  onClose,
  userId,
  onOrderUpdated,
}: OrderDetailsModalProps) {
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!order) return null;

  const createdAtMs = Date.parse(order.createdAt);
  const canCancel =
    Boolean(userId) &&
    (order.status === "pending" || order.status === "shipped") &&
    Number.isFinite(createdAtMs) &&
    Date.now() - createdAtMs <= 24 * 60 * 60 * 1000;

  const cancelOrder = async () => {
    if (!userId || !canCancel || cancelling) return;

    setCancelling(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          userId,
          updates: {
            status: "cancelled",
            cancellationReason: cancelReason.trim() || null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionMessage(String(data.error ?? "Failed to cancel order."));
        return;
      }

      setActionMessage("Order cancelled successfully.");
      setShowCancelConfirm(false);
      setCancelReason("");
      onOrderUpdated?.(order.id, "cancelled");
    } catch {
      setActionMessage("Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  };

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
          {order.status === "cancelled" && order.cancellationReason && (
            <div className="text-sm">
              <span className="text-slate-500 dark:text-slate-400">Cancellation reason</span>
              <p className="text-slate-900 dark:text-white mt-1 break-words">
                {order.cancellationReason}
              </p>
            </div>
          )}
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
                    {item.name} x {item.quantity}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {formatPrice((item.price ?? 0) * (item.quantity ?? 1))}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {order.status === "received" && (
            <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-900/20 p-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Your order was delivered. Share your review in the dedicated reviews tab.
              </p>
              <Link href={`/profile?tab=reviews&orderId=${encodeURIComponent(order.id)}`} className="mt-2 inline-block text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline" onClick={onClose}>
                Go to Reviews
              </Link>
            </div>
          )}

          {canCancel && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/20 p-3">
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
                You can cancel this order within 24 hours of placing it.
              </p>
              <button
                type="button"
                onClick={() => setShowCancelConfirm((prev) => !prev)}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {cancelling
                  ? "Cancelling..."
                  : showCancelConfirm
                  ? "Hide Cancellation Form"
                  : "Cancel Order"}
              </button>

              {showCancelConfirm && (
                <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800/60 bg-red-50/70 dark:bg-red-900/20 p-3 space-y-3">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Are you sure you want to cancel this order?
                  </p>
                  <div>
                    <label
                      htmlFor="cancel-reason"
                      className="text-xs text-slate-600 dark:text-slate-400"
                    >
                      Please give a reason for cancellation (optional). Admin will receive it.
                    </label>
                    <textarea
                      id="cancel-reason"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm"
                      placeholder="Optional reason..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={cancelOrder}
                      disabled={cancelling}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60"
                    >
                      {cancelling ? "Cancelling..." : "Yes, cancel order"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCancelConfirm(false);
                        setCancelReason("");
                      }}
                      className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold"
                    >
                      Keep Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {actionMessage && (
            <p className="text-sm text-slate-600 dark:text-slate-400">{actionMessage}</p>
          )}
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

          <ReceiptDownloadButton order={order} disabled={order.status !== "received"} />
        </div>
      </div>
    </div>
  );
}

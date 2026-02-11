"use client";

import React, { useEffect, useMemo, useState } from "react";
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
}

type ExistingReview = {
  id: string;
  productId: string;
  message: string;
  status?: string;
};

export default function OrderDetailsModal({
  order,
  onClose,
  userId,
  userName,
}: OrderDetailsModalProps) {
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL, UNCONDITIONALLY
  const [existingReviews, setExistingReviews] = useState<Record<string, ExistingReview>>({});
  const [reviewInputs, setReviewInputs] = useState<Record<string, string>>({});
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsSubmitting, setReviewsSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  // useMemo must be called unconditionally
  const productItems = useMemo(() => {
    // If no order, return empty array
    if (!order) return [];
    return (order.items ?? []).map((item) => ({
      productId: item.productId || item.id,
      name: item.name,
    })).filter((it) => it.productId);
  }, [order]);

  const hasAnyReview = Object.keys(existingReviews).length > 0;

  // useEffect must be called unconditionally
  useEffect(() => {
    // Guard clause inside the effect, not conditional hook call
    if (!order?.id || !userId) {
      return;
    }
    
    setReviewMessage(null);
    setReviewInputs({});
    setReviewsLoading(true);
    
    fetch(`/api/reviews?orderId=${order.id}&userId=${userId}`)
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d.reviews) ? d.reviews : [];
        const map: Record<string, ExistingReview> = {};
        list.forEach((r: ExistingReview & { productId?: string }) => {
          if (r.productId) map[r.productId] = r;
        });
        setExistingReviews(map);
      })
      .catch(() => setExistingReviews({}))
      .finally(() => setReviewsLoading(false));
  }, [order?.id, userId]);

  const handleSubmitReviews = async () => {
    if (!order || !userId || !userName) return;
    
    const reviews = productItems
      .map((item) => ({
        productId: item.productId,
        productName: item.name,
        message: reviewInputs[item.productId] ?? "",
      }))
      .filter((r) => r.message.trim().length > 0);

    if (!reviews.length) {
      setReviewMessage("Please write at least one review before submitting.");
      return;
    }

    setReviewsSubmitting(true);
    setReviewMessage(null);
    
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userName,
          orderId: order.id,
          reviews,
        }),
      });
      
      if (!res.ok) {
        setReviewMessage("Failed to submit reviews. Please try again.");
        return;
      }
      
      setReviewInputs({});
      const data = await res.json();
      
      if (data.created === 0) {
        setReviewMessage("Reviews were already submitted for these products.");
      } else {
        setReviewMessage("Thank you! Your reviews were sent for approval.");
      }
      
      const refreshed = await fetch(`/api/reviews?orderId=${order.id}&userId=${userId}`);
      const refreshedData = await refreshed.json();
      const list = Array.isArray(refreshedData.reviews) ? refreshedData.reviews : [];
      const map: Record<string, ExistingReview> = {};
      list.forEach((r: ExistingReview & { productId?: string }) => {
        if (r.productId) map[r.productId] = r;
      });
      setExistingReviews(map);
    } finally {
      setReviewsSubmitting(false);
    }
  };

  // Early return AFTER all hooks
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

          {order.status === "received" && userId && !hasAnyReview && (
            <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Your order was delivered. Kindly share your experience.
              </h4>
              {reviewsLoading ? (
                <p className="text-sm text-slate-500">Loading review form...</p>
              ) : (
                <div className="space-y-4">
                  {productItems.map((item) => {
                    const existing = existingReviews[item.productId];
                    return (
                      <div key={item.productId} className="border rounded-lg p-3 bg-slate-50 dark:bg-slate-800/60">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {item.name}
                        </p>
                        {existing ? (
                          <p className="text-xs text-slate-500 mt-1">
                            Review status: {existing.status ?? "pending"}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1">
                            How was your experience with {item.name}?
                          </p>
                        )}

                        {existing ? (
                          <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                            {existing.message}
                          </p>
                        ) : (
                          <textarea
                            rows={3}
                            value={reviewInputs[item.productId] ?? ""}
                            onChange={(e) =>
                              setReviewInputs((prev) => ({
                                ...prev,
                                [item.productId]: e.target.value,
                              }))
                            }
                            placeholder="Write your message here..."
                            className="mt-2 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm"
                          />
                        )}
                      </div>
                    );
                  })}

                  {reviewMessage && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {reviewMessage}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleSubmitReviews}
                    disabled={reviewsSubmitting}
                    className="w-full bg-sky-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-sky-700 disabled:opacity-60"
                  >
                    {reviewsSubmitting ? "Submitting..." : "Submit Reviews"}
                  </button>
                </div>
              )}
            </div>
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
          
          <ReceiptDownloadButton 
            order={order} 
            disabled={order.status !== "received"} 
          />
        </div>
      </div>
    </div>
  );
}
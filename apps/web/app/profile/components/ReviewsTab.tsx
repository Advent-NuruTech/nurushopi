"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiOrder } from "../types";

type ExistingReview = {
  id: string;
  orderId?: string;
  productId?: string;
  message?: string;
};

interface ReviewsTabProps {
  orders: ApiOrder[];
  userId: string;
  userName: string;
  highlightOrderId?: string | null;
}

type ReviewMap = Record<string, Record<string, ExistingReview>>;

function inputKey(orderId: string, productId: string) {
  return `${orderId}:${productId}`;
}

export default function ReviewsTab({ orders, userId, userName, highlightOrderId }: ReviewsTabProps) {
  const [reviewsByOrder, setReviewsByOrder] = useState<ReviewMap>({});
  const [reviewInputs, setReviewInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submittingOrderId, setSubmittingOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === "received"),
    [orders]
  );

  const pendingByOrder = useMemo(() => {
    return deliveredOrders
      .map((order) => {
        const items = (order.items ?? []).filter((item) => {
          const productId = item.productId || item.id;
          if (!productId) return false;
          return !reviewsByOrder[order.id]?.[productId];
        });
        return { order, items };
      })
      .filter((group) => group.items.length > 0);
  }, [deliveredOrders, reviewsByOrder]);

  const loadReviews = async () => {
    if (!deliveredOrders.length) {
      setReviewsByOrder({});
      return;
    }

    setLoading(true);
    try {
      const pairs = await Promise.all(
        deliveredOrders.map(async (order) => {
          const res = await fetch(`/api/reviews?orderId=${order.id}&userId=${userId}`);
          const data = await res.json();
          const list = Array.isArray(data.reviews) ? (data.reviews as ExistingReview[]) : [];

          const byProduct: Record<string, ExistingReview> = {};
          list.forEach((review) => {
            if (review.productId) byProduct[review.productId] = review;
          });

          return [order.id, byProduct] as const;
        })
      );

      setReviewsByOrder(Object.fromEntries(pairs));
    } catch {
      setReviewsByOrder({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, deliveredOrders.map((o) => o.id).join("|")]);

  const submitReviews = async (order: ApiOrder) => {
    const rows = (order.items ?? [])
      .map((item) => {
        const productId = item.productId || item.id;
        if (!productId) return null;

        const existing = reviewsByOrder[order.id]?.[productId];
        if (existing) return null;

        const text = (reviewInputs[inputKey(order.id, productId)] ?? "").trim();
        if (!text) return null;

        return {
          productId,
          productName: item.name,
          message: text,
        };
      })
      .filter(Boolean);

    if (!rows.length) {
      setMessage("Write at least one review before submitting.");
      return;
    }

    setSubmittingOrderId(order.id);
    setMessage(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userName,
          orderId: order.id,
          reviews: rows,
        }),
      });

      if (!res.ok) {
        setMessage("Failed to submit reviews. Please try again.");
        return;
      }

      setMessage("Thank you. Your review was submitted for approval.");
      setReviewInputs({});
      await loadReviews();
    } finally {
      setSubmittingOrderId(null);
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
      <div className="p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Reviews</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Share your experience for delivered orders.
        </p>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading review items...</p>
        ) : deliveredOrders.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Reviews become available after your order is delivered.
          </p>
        ) : pendingByOrder.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            You have reviewed all delivered products.
          </p>
        ) : (
          <div className="space-y-6">
            {pendingByOrder.map(({ order, items }) => (
              <div
                key={order.id}
                className={`rounded-xl border p-4 ${
                  highlightOrderId === order.id
                    ? "border-sky-400 bg-sky-50/40 dark:bg-sky-900/10"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="mb-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Order #{order.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Delivered on {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const productId = item.productId || item.id;
                    if (!productId) return null;

                    return (
                      <div
                        key={`${order.id}-${productId}-${idx}`}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {item.name}
                        </p>
                        <textarea
                          rows={3}
                          value={reviewInputs[inputKey(order.id, productId)] ?? ""}
                          onChange={(e) =>
                            setReviewInputs((prev) => ({
                              ...prev,
                              [inputKey(order.id, productId)]: e.target.value,
                            }))
                          }
                          placeholder="Write your review..."
                          className="mt-2 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm"
                        />
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => submitReviews(order)}
                  disabled={submittingOrderId === order.id}
                  className="mt-4 w-full sm:w-auto px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {submittingOrderId === order.id ? "Submitting..." : "Submit Reviews"}
                </button>
              </div>
            ))}
          </div>
        )}

        {message && <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{message}</p>}
      </div>
    </section>
  );
}

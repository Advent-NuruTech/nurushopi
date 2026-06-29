"use client";

import { useEffect, useMemo, useState } from "react";
import { reviewsApi, ApiClientError } from "@/lib/api";
import type { ApiOrder } from "../types";

interface ReviewsTabProps {
  orders: ApiOrder[];
  userId: string;
  highlightOrderId?: string | null;
}

type DraftReview = { rating: number; comment: string };

export default function ReviewsTab({ orders, userId, highlightOrderId }: ReviewsTabProps) {
  // Product ids the user has already reviewed (reviews are per-product, and a
  // verified-purchase check is enforced server-side).
  const [reviewedProductIds, setReviewedProductIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, DraftReview>>({});
  const [loading, setLoading] = useState(false);
  const [submittingProductId, setSubmittingProductId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === "received"),
    [orders]
  );

  const pendingByOrder = useMemo(() => {
    return deliveredOrders
      .map((order) => {
        // Only real product references can be reviewed (an item whose product was
        // deleted has productId === undefined and is skipped).
        const items = (order.items ?? []).filter(
          (item) => item.productId && !reviewedProductIds.has(item.productId)
        );
        return { order, items };
      })
      .filter((group) => group.items.length > 0);
  }, [deliveredOrders, reviewedProductIds]);

  const loadReviews = async () => {
    if (!deliveredOrders.length) {
      setReviewedProductIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const page = await reviewsApi.mine({ pageSize: 100 });
      setReviewedProductIds(new Set(page.items.map((r) => r.productId)));
    } catch {
      setReviewedProductIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, deliveredOrders.map((o) => o.id).join("|")]);

  const setDraft = (productId: string, patch: Partial<DraftReview>) =>
    setDrafts((prev) => {
      const current = prev[productId] ?? { rating: 5, comment: "" };
      return { ...prev, [productId]: { ...current, ...patch } };
    });

  const submitReview = async (productId: string) => {
    const draft = drafts[productId] ?? { rating: 5, comment: "" };
    setSubmittingProductId(productId);
    setMessage(null);
    try {
      await reviewsApi.create({
        productId,
        rating: draft.rating,
        comment: draft.comment.trim() || null,
      });
      setMessage("Thank you. Your review was submitted for approval.");
      setReviewedProductIds((prev) => new Set(prev).add(productId));
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "Failed to submit review. Please try again."
      );
    } finally {
      setSubmittingProductId(null);
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
                    const productId = item.productId as string;
                    const draft = drafts[productId] ?? { rating: 5, comment: "" };
                    return (
                      <div
                        key={`${order.id}-${productId}-${idx}`}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {item.name}
                        </p>
                        <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Rating">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              aria-label={`${star} star${star > 1 ? "s" : ""}`}
                              aria-checked={draft.rating === star}
                              role="radio"
                              onClick={() => setDraft(productId, { rating: star })}
                              className={`text-2xl leading-none ${
                                star <= draft.rating ? "text-amber-400" : "text-slate-300 dark:text-slate-600"
                              }`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <textarea
                          rows={3}
                          value={draft.comment}
                          onChange={(e) => setDraft(productId, { comment: e.target.value })}
                          placeholder="Write your review (optional)..."
                          className="mt-2 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => submitReview(productId)}
                          disabled={submittingProductId === productId}
                          className="mt-3 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold disabled:opacity-60"
                        >
                          {submittingProductId === productId ? "Submitting..." : "Submit Review"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {message && <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{message}</p>}
      </div>
    </section>
  );
}

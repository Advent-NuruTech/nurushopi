"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { reviewsApi, ApiClientError } from "@/lib/api";
import type { ReviewDTO } from "@nuru/types";

export default function ReviewsTab() {
  const [reviews, setReviews] = useState<ReviewDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("reviewId");

  const load = () => {
    setLoading(true);
    reviewsApi.admin
      .list({ status: "PENDING", pageSize: 100 })
      .then((page) => setReviews(page.items))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const row = document.getElementById(`review-${highlightId}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, reviews]);

  const updateReview = async (reviewId: string, status: "APPROVED" | "REJECTED") => {
    try {
      await reviewsApi.admin.moderate(reviewId, { status });
      load();
    } catch (err) {
      if (err instanceof ApiClientError) alert(err.message);
    }
  };

  if (loading) return <LoadingSpinner text="Loading reviews..." />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Review Approvals
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Approve or reject customer reviews before they appear publicly.
        </p>
      </div>
      {reviews.length === 0 ? (
        <p className="p-6 text-slate-500 text-center">No pending reviews.</p>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {reviews.map((r) => (
            <div
              key={r.id}
              id={`review-${r.id}`}
              className={`p-4 flex flex-col gap-2 ${
                highlightId === r.id ? "bg-sky-50/70 dark:bg-sky-900/20" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {r.userName ?? "User"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(Math.max(0, 5 - r.rating))} · {r.productId}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateReview(r.id, "APPROVED")}
                    className="px-3 py-1 rounded bg-emerald-600 text-white text-xs"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateReview(r.id, "REJECTED")}
                    className="px-3 py-1 rounded bg-red-600 text-white text-xs"
                  >
                    Reject
                  </button>
                </div>
              </div>
              {r.comment && (
                <p className="text-sm text-slate-700 dark:text-slate-300">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

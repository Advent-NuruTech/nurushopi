"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/formatPrice";
import { walletApi, ApiClientError } from "@/lib/api";
import type { WalletRedemptionDTO } from "@nuru/types";

export default function RedemptionsTab() {
  const [items, setItems] = useState<WalletRedemptionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("redemptionId");

  const load = () => {
    setLoading(true);
    walletApi.admin
      .redemptions({ status: "PENDING", pageSize: 100 })
      .then((page) => setItems(page.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const row = document.getElementById(`redemption-${highlightId}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, items]);

  const update = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      await walletApi.admin.updateRedemption(id, status);
      load();
    } catch (err) {
      if (err instanceof ApiClientError) alert(err.message);
    }
  };

  if (loading) return <LoadingSpinner text="Loading redemptions..." />;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Wallet Redemptions
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Approve or reject wallet redemption requests.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="p-6 text-slate-500 text-center">No pending redemptions.</p>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {items.map((r) => (
            <div
              key={r.id}
              id={`redemption-${r.id}`}
              className={`p-4 flex flex-col gap-2 ${
                highlightId === r.id ? "bg-sky-50/70 dark:bg-sky-900/20" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{r.userId}</p>
                  <p className="text-xs text-slate-500">
                    {r.method ?? "Cash-out"} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => update(r.id, "APPROVED")}
                    className="px-3 py-1 rounded bg-emerald-600 text-white text-xs"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => update(r.id, "REJECTED")}
                    className="px-3 py-1 rounded bg-red-600 text-white text-xs"
                  >
                    Reject
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Amount: {formatPrice(Number(r.amount))}
              </p>
              {r.details &&
                Object.entries(r.details).map(([k, v]) => (
                  <p key={k} className="text-xs text-slate-500">
                    {k}: {v}
                  </p>
                ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

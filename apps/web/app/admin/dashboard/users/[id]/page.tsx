"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/formatPrice";

type UserDetail = {
  id: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  walletBalance?: number;
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [redemptions, setRedemptions] = useState<Record<string, unknown>[]>([]);
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustAmount, setAdjustAmount] = useState<number | "">("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/admin/users/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
        setOrders(d.orders ?? []);
        setTransactions(d.transactions ?? []);
        setRedemptions(d.redemptions ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const submitAdjustment = async () => {
    if (!user) return;
    if (adjustAmount === "" || Number(adjustAmount) <= 0) return;
    setAdjusting(true);
    const res = await fetch("/api/admin/wallet/adjust", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        amount: Number(adjustAmount),
        type: adjustType,
        reason: adjustReason,
      }),
    });
    setAdjusting(false);
    if (res.ok) {
      setAdjustAmount("");
      setAdjustReason("");
      load();
    }
  };

  if (loading) return <LoadingSpinner text="Loading user..." />;
  if (!user) return <p>User not found.</p>;

  const displayName = user.fullName || user.name || "User";

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h1 className="text-2xl font-semibold mb-2">{displayName}</h1>
        <p className="text-sm text-slate-500">{user.email}</p>
        <p className="text-sm text-slate-500">{user.phone}</p>
        <p className="text-sm text-slate-700 mt-3">
          Wallet Balance: {formatPrice(Number(user.walletBalance ?? 0))}
        </p>
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold">Wallet Adjustment</h3>
          <div className="flex flex-wrap gap-2">
            <select
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value as "credit" | "debit")}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={adjustAmount}
              onChange={(e) =>
                setAdjustAmount(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="border rounded px-2 py-1 text-sm"
            />
            <input
              placeholder="Reason (optional)"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="border rounded px-2 py-1 text-sm flex-1 min-w-[160px]"
            />
            <button
              onClick={submitAdjustment}
              disabled={adjusting}
              className="bg-sky-600 text-white px-3 py-1 rounded text-sm"
            >
              {adjusting ? "Saving..." : "Apply"}
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold mb-3">Orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-slate-500">No orders.</p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={String(o.id)} className="flex justify-between text-sm border-b py-2">
                <span>#{String(o.id).slice(0, 8)}</span>
                <span>{formatPrice(Number(o.totalAmount ?? 0))}</span>
                <span className="capitalize">{String(o.status ?? "")}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold mb-3">Wallet History</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={String(t.id)} className="flex justify-between text-sm border-b py-2">
                <span className="capitalize">{String(t.type ?? "")}</span>
                <span>{String(t.source ?? "")}</span>
                <span>{formatPrice(Number(t.amount ?? 0))}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold mb-3">Redemptions</h2>
        {redemptions.length === 0 ? (
          <p className="text-sm text-slate-500">No redemptions.</p>
        ) : (
          <div className="space-y-2">
            {redemptions.map((r) => (
              <div key={String(r.id)} className="flex justify-between text-sm border-b py-2">
                <span className="capitalize">{String(r.type ?? "")}</span>
                <span>{String(r.productName ?? "")}</span>
                <span>{formatPrice(Number(r.amount ?? 0))}</span>
                <span className="capitalize">{String(r.status ?? "")}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

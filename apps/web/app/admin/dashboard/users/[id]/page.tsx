"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/formatPrice";
import { usersApi, walletApi, ApiClientError } from "@/lib/api";
import type {
  AdminUserDetailDTO,
  OrderDTO,
  WalletTransactionDTO,
  WalletRedemptionDTO,
} from "@nuru/types";

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AdminUserDetailDTO | null>(null);
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [transactions, setTransactions] = useState<WalletTransactionDTO[]>([]);
  const [redemptions, setRedemptions] = useState<WalletRedemptionDTO[]>([]);
  const [adjustType, setAdjustType] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [adjustAmount, setAdjustAmount] = useState<number | "">("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    usersApi.admin
      .get(id)
      .then((d) => {
        setUser(d.user);
        setOrders(d.orders);
        setTransactions(d.transactions);
        setRedemptions(d.redemptions);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submitAdjustment = async () => {
    if (!user) return;
    if (adjustAmount === "" || Number(adjustAmount) <= 0) return;
    setAdjusting(true);
    try {
      await walletApi.admin.adjustBalance({
        userId: user.id,
        type: adjustType,
        amount: Number(adjustAmount),
        note: adjustReason.trim() || null,
      });
      setAdjustAmount("");
      setAdjustReason("");
      load();
    } catch (err) {
      if (err instanceof ApiClientError) alert(err.message);
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading user..." />;
  if (!user) return <p>User not found.</p>;

  const displayName = user.name || "User";

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h1 className="text-2xl font-semibold mb-2">{displayName}</h1>
        <p className="text-sm text-slate-500">{user.email}</p>
        <p className="text-sm text-slate-500">{user.phone}</p>
        <p className="text-sm text-slate-700 mt-3">
          Wallet Balance: {formatPrice(Number(user.walletBalance))}
        </p>
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold">Wallet Adjustment</h3>
          <div className="flex flex-wrap gap-2">
            <select
              value={adjustType}
              onChange={(e) => setAdjustType(e.target.value as "CREDIT" | "DEBIT")}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="CREDIT">Credit</option>
              <option value="DEBIT">Debit</option>
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value === "" ? "" : Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            />
            <input
              placeholder="Note (optional)"
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
              <div key={o.id} className="flex justify-between text-sm border-b py-2">
                <span>#{o.orderNumber}</span>
                <span>{formatPrice(Number(o.total))}</span>
                <span className="capitalize">{o.status.toLowerCase()}</span>
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
              <div key={t.id} className="flex justify-between text-sm border-b py-2">
                <span className="capitalize">{t.type.toLowerCase()}</span>
                <span className="capitalize">{t.source.toLowerCase()}</span>
                <span>{formatPrice(Number(t.amount))}</span>
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
              <div key={r.id} className="flex justify-between text-sm border-b py-2">
                <span>{r.method ?? "Cash-out"}</span>
                <span>{formatPrice(Number(r.amount))}</span>
                <span className="capitalize">{r.status.toLowerCase()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

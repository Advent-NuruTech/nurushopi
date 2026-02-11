"use client";

import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatPrice } from "@/lib/formatPrice";

type WalletTx = {
  id: string;
  type?: string;
  source?: string;
  amount?: number;
  balanceAfter?: number;
  createdAt?: { toDate?: () => Date } | string;
};

type Redemption = {
  id: string;
  type?: string;
  amount?: number;
  status?: string;
  createdAt?: { toDate?: () => Date } | string;
  productName?: string;
};

type ProductOption = {
  id: string;
  name: string;
  price: number;
};

export default function WalletTab({ userId }: { userId: string }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [redeemType, setRedeemType] = useState<"cash" | "product">("cash");
  const [redeemAmount, setRedeemAmount] = useState<number | "">("");
  const [redeemPhone, setRedeemPhone] = useState("");
  const [redeemBank, setRedeemBank] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");

  const canRedeem = balance >= 150;

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const loadWallet = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/wallet?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setBalance(Number(data.walletBalance ?? 0));
      setTransactions(data.transactions ?? []);
      setRedemptions(data.redemptions ?? []);
    } catch {
      setMessage("Unable to load wallet data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, [userId]);

  useEffect(() => {
    if (redeemType !== "product") return;
    const fetchProducts = async () => {
      const snap = await getDocs(
        query(collection(db, "products"), orderBy("createdAt", "desc"))
      );
      const list = snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const price = Number(data.sellingPrice ?? data.price ?? 0);
        return {
          id: d.id,
          name: String(data.name ?? "Product"),
          price,
        };
      });
      setProducts(list);
    };
    fetchProducts();
  }, [redeemType]);

  const submitRedemption = async () => {
    if (!canRedeem) return;

    setSubmitting(true);
    setMessage(null);
    setSuccess(null);
    try {
      const payload: Record<string, unknown> = {
        userId,
        type: redeemType,
      };

      if (redeemType === "cash") {
        payload.amount = Number(redeemAmount);
        if (redeemPhone.trim()) payload.phone = redeemPhone.trim();
        if (redeemBank.trim()) payload.bankDetails = redeemBank.trim();

        if (!redeemAmount || Number(redeemAmount) < 150) {
          setMessage("Enter a valid amount (minimum KSh 150).");
          setSubmitting(false);
          return;
        }
        if (Number(redeemAmount) > balance) {
          setMessage("Amount exceeds your wallet balance.");
          setSubmitting(false);
          return;
        }
        if (!redeemPhone.trim() && !redeemBank.trim()) {
          setMessage("Enter Mpesa phone number or bank details.");
          setSubmitting(false);
          return;
        }
      } else if (selectedProduct) {
        payload.productId = selectedProduct.id;
        payload.productName = selectedProduct.name;
        if (!selectedProduct) {
          setMessage("Select a product to redeem.");
          setSubmitting(false);
          return;
        }
      }

      const res = await fetch("/api/wallet/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessage(err.error ?? "Failed to submit redemption.");
        return;
      }
      setSuccess(
        redeemType === "product"
          ? "Congratulations for being part of NuruShop. Your product will be processed and delivered."
          : "Your cash payout request was sent to admin. We will process it shortly."
      );
      setRedeemAmount("");
      setRedeemPhone("");
      setRedeemBank("");
      setSelectedProductId("");
      await loadWallet();
    } catch {
      setMessage("Failed to submit redemption.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value: WalletTx["createdAt"]) => {
    if (!value) return "";
    if (typeof value === "string") return new Date(value).toLocaleDateString();
    if (typeof value === "object" && "toDate" in value && value.toDate) {
      return value.toDate().toLocaleDateString();
    }
    return "";
  };

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Wallet</h2>
        <span className="text-xl font-bold text-emerald-600">
          {formatPrice(balance)}
        </span>
      </div>

      {!canRedeem && (
        <p className="text-sm text-slate-500">
          Wallet redemption is available once your balance reaches KSh 150.
        </p>
      )}

      {canRedeem && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <div className="flex gap-2">
            {(["cash", "product"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRedeemType(t)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  redeemType === t
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                {t === "cash" ? "Cash Payout" : "Product Redemption"}
              </button>
            ))}
          </div>

          {redeemType === "cash" ? (
            <div className="space-y-3">
              <input
                type="number"
                placeholder="Amount (KSh)"
                value={redeemAmount}
                onChange={(e) =>
                  setRedeemAmount(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full rounded border border-slate-200 dark:border-slate-700 p-2 text-sm bg-white dark:bg-slate-900"
              />
              <input
                placeholder="Mpesa phone number"
                value={redeemPhone}
                onChange={(e) => setRedeemPhone(e.target.value)}
                className="w-full rounded border border-slate-200 dark:border-slate-700 p-2 text-sm bg-white dark:bg-slate-900"
              />
              <textarea
                placeholder="Bank details (optional)"
                value={redeemBank}
                onChange={(e) => setRedeemBank(e.target.value)}
                className="w-full rounded border border-slate-200 dark:border-slate-700 p-2 text-sm bg-white dark:bg-slate-900"
                rows={3}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded border border-slate-200 dark:border-slate-700 p-2 text-sm bg-white dark:bg-slate-900"
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {formatPrice(p.price)}
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <p className="text-sm text-slate-500">
                  This product will be processed and delivered after admin approval.
                </p>
              )}
            </div>
          )}

          <button
            disabled={
              submitting ||
              (redeemType === "cash" && !redeemAmount) ||
              (redeemType === "product" && !selectedProduct) ||
              (redeemType === "cash" && !redeemPhone.trim() && !redeemBank.trim())
            }
            onClick={submitRedemption}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Redemption"}
          </button>

          {message && <p className="text-sm text-slate-600">{message}</p>}
          {success && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p>{success}</p>
              <a
                href="/profile"
                className="inline-block mt-2 text-sky-700 font-medium hover:underline"
              >
                Invite more people to keep earning →
              </a>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Earnings History
        </h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading wallet history...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-slate-500">No wallet transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-800 py-2"
              >
                <div>
                  <p className="font-medium capitalize">
                    {tx.type} - {tx.source}
                  </p>
                  <p className="text-slate-500">{formatDate(tx.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {tx.type === "debit" ? "-" : "+"}
                    {formatPrice(Number(tx.amount ?? 0))}
                  </p>
                  <p className="text-xs text-slate-500">
                    Balance: {formatPrice(Number(tx.balanceAfter ?? 0))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Redemption Requests
        </h3>
        {redemptions.length === 0 ? (
          <p className="text-sm text-slate-500">No redemption requests.</p>
        ) : (
          <div className="space-y-2">
            {redemptions.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-slate-800 py-2"
              >
                <div>
                  <p className="font-medium capitalize">
                    {r.type} {r.productName ? `- ${r.productName}` : ""}
                  </p>
                  <p className="text-slate-500">{formatDate(r.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatPrice(Number(r.amount ?? 0))}</p>
                  <p className="text-xs text-slate-500">{r.status ?? "pending"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

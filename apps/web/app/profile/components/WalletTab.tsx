"use client";

import React, { useEffect, useState } from "react";
import { walletApi, ApiClientError } from "@/lib/api";
import { formatPrice } from "@/lib/formatPrice";
import type { WalletTransactionDTO, WalletRedemptionDTO } from "@nuru/types";

/** API-enforced minimum cash-out (mirrors the wallet module's MIN_REDEMPTION). */
const MIN_REDEMPTION = 100;

export default function WalletTab() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransactionDTO[]>([]);
  const [redemptions, setRedemptions] = useState<WalletRedemptionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [redeemAmount, setRedeemAmount] = useState<number | "">("");
  const [redeemPhone, setRedeemPhone] = useState("");
  const [redeemBank, setRedeemBank] = useState("");

  const canRedeem = balance >= MIN_REDEMPTION;

  const loadWallet = async () => {
    setLoading(true);
    try {
      // The wallet endpoints are scoped to the signed-in user by the session cookie.
      const [{ wallet }, txPage, redemptionPage] = await Promise.all([
        walletApi.summary(),
        walletApi.transactions({ pageSize: 50, sort: "newest" }),
        walletApi.redemptions({ pageSize: 50, sort: "newest" }),
      ]);
      setBalance(Number(wallet.balance));
      setTransactions(txPage.items);
      setRedemptions(redemptionPage.items);
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "Unable to load wallet data.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWallet();
  }, []);

  const submitRedemption = async () => {
    if (!canRedeem) return;

    setMessage(null);
    setSuccess(null);

    const amount = Number(redeemAmount);
    if (!redeemAmount || amount < MIN_REDEMPTION) {
      setMessage(`Enter a valid amount (minimum ${formatPrice(MIN_REDEMPTION)}).`);
      return;
    }
    if (amount > balance) {
      setMessage("Amount exceeds your wallet balance.");
      return;
    }
    const phone = redeemPhone.trim();
    const bank = redeemBank.trim();
    if (!phone && !bank) {
      setMessage("Enter an M-Pesa phone number or bank details.");
      return;
    }

    setSubmitting(true);
    try {
      await walletApi.requestRedemption({
        amount,
        method: phone ? "mpesa" : "bank",
        details: phone ? { phone } : { bank },
      });
      setSuccess("Your cash payout request was sent to admin. We will process it shortly.");
      setRedeemAmount("");
      setRedeemPhone("");
      setRedeemBank("");
      await loadWallet();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "Failed to submit redemption.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value: string) =>
    value ? new Date(value).toLocaleDateString() : "";

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Wallet</h2>
        <span className="text-xl font-bold text-emerald-600">{formatPrice(balance)}</span>
      </div>

      {!canRedeem && (
        <p className="text-sm text-slate-500">
          Wallet redemption is available once your balance reaches {formatPrice(MIN_REDEMPTION)}.
        </p>
      )}

      {canRedeem && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Cash Payout</p>
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
              placeholder="M-Pesa phone number"
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

          <button
            disabled={submitting || !redeemAmount || (!redeemPhone.trim() && !redeemBank.trim())}
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
                href="/profile?tab=invite"
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
                    {tx.type.toLowerCase()} - {tx.source.toLowerCase()}
                  </p>
                  <p className="text-slate-500">{formatDate(tx.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {tx.type === "DEBIT" ? "-" : "+"}
                    {formatPrice(Number(tx.amount))}
                  </p>
                  <p className="text-xs text-slate-500">
                    Balance: {formatPrice(Number(tx.balanceAfter))}
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
                  <p className="font-medium capitalize">{r.method ?? "cash"}</p>
                  <p className="text-slate-500">{formatDate(r.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatPrice(Number(r.amount))}</p>
                  <p className="text-xs text-slate-500">{r.status.toLowerCase()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

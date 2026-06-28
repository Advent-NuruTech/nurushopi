import { Prisma, type WalletTransaction } from "@nuru/db";
import type { WalletTxSource } from "@nuru/types";
import { Errors } from "../../lib/errors.js";

/**
 * Low-level wallet ledger primitives. Every balance change goes through here so
 * that `users.walletBalance` and the `wallet_transactions` ledger can never drift
 * apart: each helper mutates the balance AND writes a matching ledger row, and is
 * designed to run inside an enclosing `$transaction` (it takes a `tx` client).
 *
 * Debits are guarded against overdraw and races with a conditional `updateMany`
 * (the same stock-floor technique the orders module uses), so concurrent spends
 * can never drive a balance negative.
 */

/** Prisma transaction client — the subset of the client available inside `$transaction`. */
export type Tx = Prisma.TransactionClient;

/** Flat referral reward credited to a referrer on the referred user's first order. */
export const REFERRAL_REWARD = new Prisma.Decimal(100);

/** Minimum amount a user may request to cash out. */
export const MIN_REDEMPTION = new Prisma.Decimal(100);

const D = (v: Prisma.Decimal | number | string): Prisma.Decimal =>
  new Prisma.Decimal(v.toString());

interface LedgerMeta {
  orderId?: string | null;
  redemptionId?: string | null;
  note?: string | null;
}

/**
 * Credit a user's wallet and append a CREDIT ledger row. Returns the new row.
 * Credits cannot fail on balance grounds, so no conditional guard is needed.
 */
export async function creditWallet(
  tx: Tx,
  userId: string,
  amount: Prisma.Decimal,
  source: Extract<WalletTxSource, "AFFILIATE" | "ADJUSTMENT" | "REFUND">,
  meta: LedgerMeta = {},
): Promise<WalletTransaction> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true },
  });
  if (!user) throw Errors.notFound("User not found.");

  const balanceAfter = D(user.walletBalance).add(amount);
  await tx.user.update({ where: { id: userId }, data: { walletBalance: balanceAfter } });
  return tx.walletTransaction.create({
    data: {
      userId,
      type: "CREDIT",
      source,
      amount,
      balanceAfter,
      status: "APPROVED",
      orderId: meta.orderId ?? null,
      redemptionId: meta.redemptionId ?? null,
      metadata: meta.note ? { note: meta.note } : undefined,
    },
  });
}

/**
 * Debit a user's wallet and append a DEBIT ledger row. The deduction is applied
 * with a conditional `updateMany` (balance-floor guard) so a concurrent debit
 * can never overdraw; a lost race surfaces as a 409. Returns the new row.
 */
export async function debitWallet(
  tx: Tx,
  userId: string,
  amount: Prisma.Decimal,
  source: Extract<WalletTxSource, "REDEEM" | "ADJUSTMENT">,
  meta: LedgerMeta = {},
): Promise<WalletTransaction> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true },
  });
  if (!user) throw Errors.notFound("User not found.");

  const balance = D(user.walletBalance);
  if (balance.lessThan(amount)) throw Errors.badRequest("Insufficient wallet balance.");
  const balanceAfter = balance.sub(amount);

  const res = await tx.user.updateMany({
    where: { id: userId, walletBalance: { gte: amount } },
    data: { walletBalance: { decrement: amount } },
  });
  if (res.count === 0) throw Errors.conflict("Wallet balance changed, please retry.");

  return tx.walletTransaction.create({
    data: {
      userId,
      type: "DEBIT",
      source,
      amount,
      balanceAfter,
      status: "APPROVED",
      orderId: meta.orderId ?? null,
      redemptionId: meta.redemptionId ?? null,
      metadata: meta.note ? { note: meta.note } : undefined,
    },
  });
}

/**
 * Reward a referrer once, when the user they referred places their first order.
 * Rewarding on first purchase (rather than at signup) defends against farming
 * rewards with throwaway accounts. Must be called inside the checkout transaction
 * AFTER the order has been created (so the order count includes it).
 */
export async function rewardReferralOnFirstOrder(tx: Tx, referredUserId: string): Promise<void> {
  const referral = await tx.referral.findUnique({ where: { referredId: referredUserId } });
  if (!referral || referral.rewarded) return;

  // The order just created in this transaction is the user's first.
  const orderCount = await tx.order.count({ where: { userId: referredUserId } });
  if (orderCount !== 1) return;

  await tx.referral.update({
    where: { id: referral.id },
    data: { rewarded: true, rewardAmount: REFERRAL_REWARD },
  });
  await creditWallet(tx, referral.referrerId, REFERRAL_REWARD, "AFFILIATE", {
    note: `Referral reward for ${referredUserId}`,
  });
}

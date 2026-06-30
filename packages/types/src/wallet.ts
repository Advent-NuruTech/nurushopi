import { z } from "zod";
import { idSchema, moneySchema, paginationQuerySchema } from "./catalog.js";

// ---------------------------------------------------------------------------
// Wallet & referral
//
// The wallet is an append-only ledger: every balance change is a WalletTransaction
// (CREDIT or DEBIT) carrying the resulting balance, so the running balance is
// always reconstructable and auditable. Balances are NEVER mutated without a
// matching ledger row, and amounts coming from the client are never trusted —
// the server re-reads the live balance for every debit (see the wallet module).
//
// Money is carried as a string in DTOs to avoid float precision loss, mirroring
// the catalog / orders / wholesale contracts.
// ---------------------------------------------------------------------------

/** Direction of a ledger entry. Mirrors the Prisma `WalletTxType` enum. */
export const WALLET_TX_TYPES = ["CREDIT", "DEBIT"] as const;
export type WalletTxType = (typeof WALLET_TX_TYPES)[number];

/** What caused a ledger entry. Mirrors the Prisma `WalletTxSource` enum. */
export const WALLET_TX_SOURCES = ["AFFILIATE", "REDEEM", "ADJUSTMENT", "REFUND"] as const;
export type WalletTxSource = (typeof WALLET_TX_SOURCES)[number];

/** Approval state of a ledger entry. Mirrors the Prisma `WalletTxStatus` enum. */
export const WALLET_TX_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type WalletTxStatus = (typeof WALLET_TX_STATUSES)[number];

/** Cash-out request lifecycle. Mirrors the Prisma `RedemptionStatus` enum. */
export const REDEMPTION_STATUSES = ["PENDING", "APPROVED", "REJECTED", "PAID"] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];

/** A positive money amount (strictly greater than zero), coerced from string/number. */
export const positiveAmountSchema = moneySchema.refine((v) => v > 0, {
  message: "Amount must be greater than zero.",
});

// ---- Customer payloads ----

/** Free-form payout details (e.g. { provider: "mpesa", phone: "+254…" }). */
export const redemptionDetailsSchema = z.record(z.string().trim().max(200));

/** A wallet cash-out request. */
export const redemptionRequestSchema = z
  .object({
    amount: positiveAmountSchema,
    method: z.string().trim().min(1, "Payout method is required.").max(40),
    details: redemptionDetailsSchema.optional().nullable(),
  })
  .strict();
export type RedemptionRequestInput = z.infer<typeof redemptionRequestSchema>;

/** Attach a referral code after signup (one-time, for accounts not yet referred). */
export const applyReferralSchema = z
  .object({ code: z.string().trim().min(1, "Referral code is required.").max(40) })
  .strict();
export type ApplyReferralInput = z.infer<typeof applyReferralSchema>;

// ---- Listing / filtering ----

export const walletTransactionQuerySchema = paginationQuerySchema.extend({
  type: z.enum(WALLET_TX_TYPES).optional(),
  source: z.enum(WALLET_TX_SOURCES).optional(),
  userId: idSchema.optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});
export type WalletTransactionQuery = z.infer<typeof walletTransactionQuerySchema>;

export const redemptionQuerySchema = paginationQuerySchema.extend({
  status: z.enum(REDEMPTION_STATUSES).optional(),
  userId: idSchema.optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
});
export type RedemptionQuery = z.infer<typeof redemptionQuerySchema>;

// ---- Admin payloads ----

/** Admin transition of a redemption request. */
export const redemptionStatusUpdateSchema = z
  .object({ status: z.enum(REDEMPTION_STATUSES) })
  .strict();
export type RedemptionStatusUpdateInput = z.infer<typeof redemptionStatusUpdateSchema>;

/** Admin manual wallet adjustment (always writes a ledger row). */
export const walletAdjustmentSchema = z
  .object({
    userId: idSchema,
    type: z.enum(WALLET_TX_TYPES),
    amount: positiveAmountSchema,
    note: z.string().trim().max(500).optional().nullable(),
  })
  .strict();
export type WalletAdjustmentInput = z.infer<typeof walletAdjustmentSchema>;

// ---- DTOs ----

export interface WalletSummaryDTO {
  /** Current spendable balance. */
  balance: string;
  /** The user's own referral code to share. */
  referralCode: string | null;
  /** Lifetime credited (AFFILIATE + ADJUSTMENT credits + refunds). */
  totalEarned: string;
  /** Total amount tied up in PENDING cash-out requests. */
  pendingRedemptions: string;
  /** Number of users this user has referred. */
  referralCount: number;
}

export interface WalletTransactionDTO {
  id: string;
  userId: string;
  type: WalletTxType;
  source: WalletTxSource;
  amount: string;
  balanceAfter: string;
  status: WalletTxStatus;
  orderId: string | null;
  redemptionId: string | null;
  note: string | null;
  createdAt: string;
}

export interface WalletRedemptionDTO {
  id: string;
  userId: string;
  amount: string;
  status: RedemptionStatus;
  method: string | null;
  details: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReferredUserDTO {
  id: string;
  name: string | null;
  joinedAt: string;
  /** Whether the referral reward has been paid out for this signup. */
  rewarded: boolean;
}

export interface ReferralSummaryDTO {
  code: string | null;
  referralCount: number;
  /** Total reward credited from all rewarded referrals. */
  totalRewardEarned: string;
  referrals: ReferredUserDTO[];
}

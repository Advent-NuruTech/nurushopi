import { prisma, Prisma } from "@nuru/db";
import type {
  Paginated,
  RedemptionQuery,
  RedemptionRequestInput,
  RedemptionStatus,
  WalletAdjustmentInput,
  WalletRedemptionDTO,
  WalletSummaryDTO,
  WalletTransactionDTO,
  WalletTransactionQuery,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { creditWallet, debitWallet, MIN_REDEMPTION } from "./ledger.js";
import { toWalletRedemptionDTO, toWalletTransactionDTO } from "./serializers.js";

const ZERO = (): Prisma.Decimal => new Prisma.Decimal(0);

// ---------------------------------------------------------------------------
// Wallet summary
// ---------------------------------------------------------------------------

export async function getSummary(userId: string): Promise<WalletSummaryDTO> {
  const [user, referralCount, pendingAgg, earnedAgg] = await prisma.$transaction([
    prisma.user.findUnique({
      where: { id: userId },
      select: { walletBalance: true, referralCode: true },
    }),
    prisma.user.count({ where: { referredById: userId } }),
    prisma.walletRedemption.aggregate({
      _sum: { amount: true },
      where: { userId, status: "PENDING" },
    }),
    prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "CREDIT" },
    }),
  ]);

  if (!user) throw Errors.notFound("User not found.");

  return {
    balance: user.walletBalance.toString(),
    referralCode: user.referralCode,
    totalEarned: (earnedAgg._sum.amount ?? ZERO()).toString(),
    pendingRedemptions: (pendingAgg._sum.amount ?? ZERO()).toString(),
    referralCount,
  };
}

// ---------------------------------------------------------------------------
// Transactions (ledger)
// ---------------------------------------------------------------------------

function buildTxWhere(
  query: WalletTransactionQuery,
  scopeUserId?: string,
): Prisma.WalletTransactionWhereInput {
  const where: Prisma.WalletTransactionWhereInput = {};
  if (scopeUserId) where.userId = scopeUserId;
  else if (query.userId) where.userId = query.userId;
  if (query.type) where.type = query.type;
  if (query.source) where.source = query.source;
  return where;
}

async function listTransactions(
  query: WalletTransactionQuery,
  scopeUserId?: string,
): Promise<Paginated<WalletTransactionDTO>> {
  const where = buildTxWhere(query, scopeUserId);
  const skip = (query.page - 1) * query.pageSize;

  const [total, rows] = await prisma.$transaction([
    prisma.walletTransaction.count({ where }),
    prisma.walletTransaction.findMany({
      where,
      orderBy: { createdAt: query.sort === "oldest" ? "asc" : "desc" },
      skip,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map(toWalletTransactionDTO),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/** Customer ledger — scoped to the authenticated user. */
export function listForUser(
  userId: string,
  query: WalletTransactionQuery,
): Promise<Paginated<WalletTransactionDTO>> {
  return listTransactions(query, userId);
}

/** Admin ledger — every user's transactions, filterable by userId. */
export function adminListTransactions(
  query: WalletTransactionQuery,
): Promise<Paginated<WalletTransactionDTO>> {
  return listTransactions(query);
}

// ---------------------------------------------------------------------------
// Redemptions (cash-out)
// ---------------------------------------------------------------------------

function buildRedemptionWhere(
  query: RedemptionQuery,
  scopeUserId?: string,
): Prisma.WalletRedemptionWhereInput {
  const where: Prisma.WalletRedemptionWhereInput = {};
  if (scopeUserId) where.userId = scopeUserId;
  else if (query.userId) where.userId = query.userId;
  if (query.status) where.status = query.status;
  return where;
}

async function listRedemptions(
  query: RedemptionQuery,
  scopeUserId?: string,
): Promise<Paginated<WalletRedemptionDTO>> {
  const where = buildRedemptionWhere(query, scopeUserId);
  const skip = (query.page - 1) * query.pageSize;

  const [total, rows] = await prisma.$transaction([
    prisma.walletRedemption.count({ where }),
    prisma.walletRedemption.findMany({
      where,
      orderBy: { createdAt: query.sort === "oldest" ? "asc" : "desc" },
      skip,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map(toWalletRedemptionDTO),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export function listRedemptionsForUser(
  userId: string,
  query: RedemptionQuery,
): Promise<Paginated<WalletRedemptionDTO>> {
  return listRedemptions(query, userId);
}

export function adminListRedemptions(
  query: RedemptionQuery,
): Promise<Paginated<WalletRedemptionDTO>> {
  return listRedemptions(query);
}

/**
 * Request a cash-out. The funds are reserved immediately (debited from the
 * balance with a ledger row) so the same credit can't be spent twice while the
 * request is pending; a later rejection refunds them.
 */
export async function requestRedemption(
  userId: string,
  input: RedemptionRequestInput,
): Promise<WalletRedemptionDTO> {
  const amount = new Prisma.Decimal(input.amount);
  if (amount.lessThan(MIN_REDEMPTION)) {
    throw Errors.badRequest(`The minimum cash-out is ${MIN_REDEMPTION.toString()}.`);
  }

  const redemption = await prisma.$transaction(async (tx) => {
    const created = await tx.walletRedemption.create({
      data: {
        userId,
        amount,
        method: input.method,
        details: input.details ?? undefined,
        status: "PENDING",
      },
    });
    // Reserve the funds; throws 400 if the balance is insufficient.
    await debitWallet(tx, userId, amount, "REDEEM", {
      redemptionId: created.id,
      note: `Cash-out via ${input.method}`,
    });
    return created;
  });

  return toWalletRedemptionDTO(redemption);
}

/**
 * Admin transition of a redemption. Rejecting an unresolved request refunds the
 * reserved funds; PAID/REJECTED are terminal. The refund is guarded so it can
 * only ever happen once.
 */
export async function updateRedemptionStatus(
  id: string,
  status: RedemptionStatus,
): Promise<WalletRedemptionDTO> {
  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.walletRedemption.findUnique({ where: { id } });
    if (!current) throw Errors.notFound("Redemption not found.");

    if (current.status === "PAID" || current.status === "REJECTED") {
      throw Errors.conflict(`A ${current.status.toLowerCase()} redemption cannot be changed.`);
    }

    if (status === "REJECTED") {
      await creditWallet(tx, current.userId, new Prisma.Decimal(current.amount.toString()), "REFUND", {
        redemptionId: current.id,
        note: "Cash-out rejected",
      });
    }

    return tx.walletRedemption.update({ where: { id }, data: { status } });
  });

  return toWalletRedemptionDTO(updated);
}

// ---------------------------------------------------------------------------
// Admin manual adjustment
// ---------------------------------------------------------------------------

export async function adjustBalance(input: WalletAdjustmentInput): Promise<WalletTransactionDTO> {
  const amount = new Prisma.Decimal(input.amount);

  const txRow = await prisma.$transaction((tx) =>
    input.type === "CREDIT"
      ? creditWallet(tx, input.userId, amount, "ADJUSTMENT", { note: input.note ?? null })
      : debitWallet(tx, input.userId, amount, "ADJUSTMENT", { note: input.note ?? null }),
  );

  return toWalletTransactionDTO(txRow);
}

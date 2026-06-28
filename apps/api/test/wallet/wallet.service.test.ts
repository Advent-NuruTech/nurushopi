import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma } from "@nuru/db";
import * as wallet from "../../src/modules/wallet/wallet.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const decimal = (s: string) => ({ toString: () => s });

function txRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "wt1",
    userId: "u1",
    type: "CREDIT",
    source: "AFFILIATE",
    amount: decimal("100.00"),
    balanceAfter: decimal("250.00"),
    status: "APPROVED",
    orderId: null,
    redemptionId: null,
    metadata: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function redemptionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "wr1",
    userId: "u1",
    amount: decimal("500.00"),
    status: "PENDING",
    method: "mpesa",
    details: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(p)
      : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("wallet.getSummary", () => {
  it("assembles balance, referral code and aggregates", async () => {
    p.user.findUnique.mockResolvedValue({ walletBalance: decimal("250.00"), referralCode: "ABC123" });
    p.user.count.mockResolvedValue(3);
    p.walletRedemption.aggregate.mockResolvedValue({ _sum: { amount: decimal("500.00") } });
    p.walletTransaction.aggregate.mockResolvedValue({ _sum: { amount: decimal("600.00") } });

    const dto = await wallet.getSummary("u1");

    expect(dto).toEqual({
      balance: "250.00",
      referralCode: "ABC123",
      totalEarned: "600.00",
      pendingRedemptions: "500.00",
      referralCount: 3,
    });
  });

  it("defaults null aggregates to zero", async () => {
    p.user.findUnique.mockResolvedValue({ walletBalance: decimal("0.00"), referralCode: null });
    p.user.count.mockResolvedValue(0);
    p.walletRedemption.aggregate.mockResolvedValue({ _sum: { amount: null } });
    p.walletTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const dto = await wallet.getSummary("u1");
    expect(dto.totalEarned).toBe("0.00");
    expect(dto.pendingRedemptions).toBe("0.00");
  });

  it("throws 404 when the user is gone", async () => {
    p.user.findUnique.mockResolvedValue(null);
    p.user.count.mockResolvedValue(0);
    p.walletRedemption.aggregate.mockResolvedValue({ _sum: { amount: null } });
    p.walletTransaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
    await expect(wallet.getSummary("gone")).rejects.toMatchObject({ status: 404 });
  });
});

describe("wallet.listForUser / adminListTransactions", () => {
  it("scopes the customer ledger to the user", async () => {
    p.walletTransaction.count.mockResolvedValue(2);
    p.walletTransaction.findMany.mockResolvedValue([txRow()]);

    const res = await wallet.listForUser("u1", { page: 1, pageSize: 20, sort: "newest" } as never);

    expect(res.total).toBe(2);
    expect(res.items[0]?.amount).toBe("100.00");
    expect(p.walletTransaction.findMany.mock.calls[0][0].where.userId).toBe("u1");
    expect(p.walletTransaction.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: "desc" });
  });

  it("admin can filter by userId / source and sort oldest-first", async () => {
    p.walletTransaction.count.mockResolvedValue(0);
    p.walletTransaction.findMany.mockResolvedValue([]);

    await wallet.adminListTransactions({
      page: 1,
      pageSize: 50,
      sort: "oldest",
      userId: "u9",
      source: "REDEEM",
    } as never);

    const args = p.walletTransaction.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: "u9", source: "REDEEM" });
    expect(args.orderBy).toEqual({ createdAt: "asc" });
  });
});

describe("wallet.requestRedemption", () => {
  const input = { amount: 500, method: "mpesa", details: null } as never;

  it("creates a PENDING redemption and reserves the funds via a DEBIT", async () => {
    p.walletRedemption.create.mockResolvedValue(redemptionRow());
    p.user.findUnique.mockResolvedValue({ walletBalance: decimal("1000.00") });
    p.user.updateMany.mockResolvedValue({ count: 1 });
    p.walletTransaction.create.mockResolvedValue(txRow({ type: "DEBIT", source: "REDEEM" }));

    const dto = await wallet.requestRedemption("u1", input);

    expect(dto.status).toBe("PENDING");
    expect(p.walletRedemption.create.mock.calls[0][0].data).toMatchObject({
      userId: "u1",
      method: "mpesa",
      status: "PENDING",
    });
    // Funds reserved with a balance-floor guarded debit + a DEBIT/REDEEM ledger row.
    expect(p.user.updateMany).toHaveBeenCalledTimes(1);
    const ledger = p.walletTransaction.create.mock.calls[0][0].data;
    expect(ledger.type).toBe("DEBIT");
    expect(ledger.source).toBe("REDEEM");
    expect(ledger.redemptionId).toBe("wr1");
  });

  it("rejects an amount below the minimum (400) before touching the db", async () => {
    await expect(
      wallet.requestRedemption("u1", { amount: 50, method: "mpesa", details: null } as never),
    ).rejects.toMatchObject({ status: 400 });
    expect(p.walletRedemption.create).not.toHaveBeenCalled();
  });

  it("rejects when the balance is insufficient (400)", async () => {
    p.walletRedemption.create.mockResolvedValue(redemptionRow());
    p.user.findUnique.mockResolvedValue({ walletBalance: decimal("100.00") });

    await expect(wallet.requestRedemption("u1", input)).rejects.toMatchObject({ status: 400 });
    expect(p.user.updateMany).not.toHaveBeenCalled();
  });
});

describe("wallet.updateRedemptionStatus", () => {
  it("refunds the reserved funds when rejecting a pending request", async () => {
    p.walletRedemption.findUnique.mockResolvedValue(redemptionRow({ status: "PENDING" }));
    p.user.findUnique.mockResolvedValue({ walletBalance: decimal("0.00") });
    p.user.update.mockResolvedValue({});
    p.walletTransaction.create.mockResolvedValue(txRow({ type: "CREDIT", source: "REFUND" }));
    p.walletRedemption.update.mockResolvedValue(redemptionRow({ status: "REJECTED" }));

    const dto = await wallet.updateRedemptionStatus("wr1", "REJECTED");

    expect(dto.status).toBe("REJECTED");
    const ledger = p.walletTransaction.create.mock.calls[0][0].data;
    expect(ledger.type).toBe("CREDIT");
    expect(ledger.source).toBe("REFUND");
  });

  it("does not refund when approving a pending request", async () => {
    p.walletRedemption.findUnique.mockResolvedValue(redemptionRow({ status: "PENDING" }));
    p.walletRedemption.update.mockResolvedValue(redemptionRow({ status: "APPROVED" }));

    const dto = await wallet.updateRedemptionStatus("wr1", "APPROVED");

    expect(dto.status).toBe("APPROVED");
    expect(p.walletTransaction.create).not.toHaveBeenCalled();
  });

  it("refuses to change a terminal (PAID) redemption with a 409", async () => {
    p.walletRedemption.findUnique.mockResolvedValue(redemptionRow({ status: "PAID" }));
    await expect(wallet.updateRedemptionStatus("wr1", "REJECTED")).rejects.toMatchObject({
      status: 409,
    });
    expect(p.walletRedemption.update).not.toHaveBeenCalled();
  });

  it("throws 404 for a missing redemption", async () => {
    p.walletRedemption.findUnique.mockResolvedValue(null);
    await expect(wallet.updateRedemptionStatus("gone", "PAID")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("wallet.adjustBalance", () => {
  it("credits a wallet and writes an ADJUSTMENT ledger row", async () => {
    p.user.findUnique.mockResolvedValue({ walletBalance: decimal("100.00") });
    p.user.update.mockResolvedValue({});
    p.walletTransaction.create.mockResolvedValue(
      txRow({ type: "CREDIT", source: "ADJUSTMENT", amount: decimal("50.00"), balanceAfter: decimal("150.00") }),
    );

    const dto = await wallet.adjustBalance({ userId: "u1", type: "CREDIT", amount: 50, note: "goodwill" } as never);

    expect(dto.type).toBe("CREDIT");
    expect(dto.balanceAfter).toBe("150.00");
    const data = p.walletTransaction.create.mock.calls[0][0].data;
    expect(data.source).toBe("ADJUSTMENT");
  });

  it("refuses to debit below zero (400)", async () => {
    p.user.findUnique.mockResolvedValue({ walletBalance: decimal("10.00") });
    await expect(
      wallet.adjustBalance({ userId: "u1", type: "DEBIT", amount: 50, note: null } as never),
    ).rejects.toMatchObject({ status: 400 });
    expect(p.user.updateMany).not.toHaveBeenCalled();
  });
});

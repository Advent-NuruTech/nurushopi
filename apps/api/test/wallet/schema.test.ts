import { describe, it, expect } from "vitest";
import {
  applyReferralSchema,
  redemptionQuerySchema,
  redemptionRequestSchema,
  redemptionStatusUpdateSchema,
  walletAdjustmentSchema,
  walletTransactionQuerySchema,
} from "@nuru/types";

const cuid = "ckabcdefghijklmnopqrstuvwx";

describe("redemptionRequestSchema", () => {
  const base = { amount: 500, method: "mpesa" };

  it("accepts a valid request and coerces a numeric-string amount", () => {
    const r = redemptionRequestSchema.parse({ ...base, amount: "500" });
    expect(r.amount).toBe(500);
    expect(r.method).toBe("mpesa");
  });

  it("accepts optional payout details", () => {
    const r = redemptionRequestSchema.parse({
      ...base,
      details: { phone: "+254700000000" },
    });
    expect(r.details).toEqual({ phone: "+254700000000" });
  });

  it("rejects a zero or negative amount", () => {
    expect(redemptionRequestSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(redemptionRequestSchema.safeParse({ ...base, amount: -10 }).success).toBe(false);
  });

  it("requires a payout method", () => {
    expect(redemptionRequestSchema.safeParse({ ...base, method: "" }).success).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    expect(redemptionRequestSchema.safeParse({ ...base, userId: cuid }).success).toBe(false);
  });
});

describe("walletAdjustmentSchema", () => {
  const base = { userId: cuid, type: "CREDIT" as const, amount: 100 };

  it("accepts a credit and a debit", () => {
    expect(walletAdjustmentSchema.parse(base).type).toBe("CREDIT");
    expect(walletAdjustmentSchema.parse({ ...base, type: "DEBIT" }).type).toBe("DEBIT");
  });

  it("rejects an invalid type or empty userId but accepts a legacy id", () => {
    expect(walletAdjustmentSchema.safeParse({ ...base, type: "BOGUS" }).success).toBe(false);
    expect(walletAdjustmentSchema.safeParse({ ...base, userId: "" }).success).toBe(false);
    // Migrated users keep their original Firebase uid (not a cuid).
    expect(walletAdjustmentSchema.safeParse({ ...base, userId: "FireBaseUid28charslong000000" }).success).toBe(true);
  });

  it("rejects a non-positive amount", () => {
    expect(walletAdjustmentSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });
});

describe("redemptionStatusUpdateSchema", () => {
  it("validates the redemption status enum", () => {
    expect(redemptionStatusUpdateSchema.parse({ status: "PAID" }).status).toBe("PAID");
    expect(redemptionStatusUpdateSchema.safeParse({ status: "SHIPPED" }).success).toBe(false);
  });
});

describe("applyReferralSchema", () => {
  it("requires a non-empty code and trims it", () => {
    expect(applyReferralSchema.parse({ code: " ABC123 " }).code).toBe("ABC123");
    expect(applyReferralSchema.safeParse({ code: "" }).success).toBe(false);
  });
});

describe("wallet listing schemas", () => {
  it("applies pagination + sort defaults to the ledger query", () => {
    expect(walletTransactionQuerySchema.parse({})).toMatchObject({
      page: 1,
      pageSize: 20,
      sort: "newest",
    });
  });

  it("accepts type / source filters and rejects bad ones", () => {
    const q = walletTransactionQuerySchema.parse({ type: "DEBIT", source: "REDEEM" });
    expect(q.type).toBe("DEBIT");
    expect(q.source).toBe("REDEEM");
    expect(walletTransactionQuerySchema.safeParse({ type: "BOGUS" }).success).toBe(false);
  });

  it("accepts a redemption status filter", () => {
    expect(redemptionQuerySchema.parse({ status: "PENDING" }).status).toBe("PENDING");
    expect(redemptionQuerySchema.safeParse({ status: "BOGUS" }).success).toBe(false);
  });
});

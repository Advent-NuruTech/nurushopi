import { describe, it, expect } from "vitest";
import type { WalletRedemption, WalletTransaction } from "@nuru/db";
import {
  toWalletRedemptionDTO,
  toWalletTransactionDTO,
} from "../../src/modules/wallet/serializers.js";

const decimal = (s: string) => ({ toString: () => s }) as unknown as WalletTransaction["amount"];

function makeTx(overrides: Partial<WalletTransaction> = {}): WalletTransaction {
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
    metadata: { note: "Referral reward for u2" },
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  } as WalletTransaction;
}

function makeRedemption(overrides: Partial<WalletRedemption> = {}): WalletRedemption {
  return {
    id: "wr1",
    userId: "u1",
    amount: decimal("500.00") as unknown as WalletRedemption["amount"],
    status: "PENDING",
    method: "mpesa",
    details: { phone: "+254700000000" },
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    ...overrides,
  } as WalletRedemption;
}

describe("toWalletTransactionDTO", () => {
  it("serialises money to strings and extracts the metadata note", () => {
    const dto = toWalletTransactionDTO(makeTx());
    expect(dto.amount).toBe("100.00");
    expect(dto.balanceAfter).toBe("250.00");
    expect(dto.note).toBe("Referral reward for u2");
    expect(dto.type).toBe("CREDIT");
    expect(dto.source).toBe("AFFILIATE");
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns a null note when metadata is absent or noteless", () => {
    expect(toWalletTransactionDTO(makeTx({ metadata: null })).note).toBeNull();
    expect(toWalletTransactionDTO(makeTx({ metadata: { foo: "bar" } })).note).toBeNull();
  });

  it("passes through order / redemption links", () => {
    const dto = toWalletTransactionDTO(
      makeTx({ type: "DEBIT", source: "REDEEM", orderId: "o1", redemptionId: "r1" }),
    );
    expect(dto.orderId).toBe("o1");
    expect(dto.redemptionId).toBe("r1");
  });
});

describe("toWalletRedemptionDTO", () => {
  it("serialises a redemption with string details", () => {
    const dto = toWalletRedemptionDTO(makeRedemption());
    expect(dto.amount).toBe("500.00");
    expect(dto.status).toBe("PENDING");
    expect(dto.method).toBe("mpesa");
    expect(dto.details).toEqual({ phone: "+254700000000" });
    expect(dto.updatedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("coerces non-string detail values and tolerates null details", () => {
    const dto = toWalletRedemptionDTO(
      makeRedemption({ details: { accountId: 12345 } as unknown as WalletRedemption["details"] }),
    );
    expect(dto.details).toEqual({ accountId: "12345" });
    expect(toWalletRedemptionDTO(makeRedemption({ details: null })).details).toBeNull();
  });
});

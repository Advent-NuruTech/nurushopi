import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma } from "@nuru/db";
import * as referral from "../../src/modules/wallet/referral.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const decimal = (s: string) => ({ toString: () => s });

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(p)
      : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("referral.getSummary", () => {
  it("returns the code, count and sums only rewarded payouts", async () => {
    p.user.findUnique.mockResolvedValue({ referralCode: "ABC123" });
    p.referral.findMany.mockResolvedValue([
      {
        rewarded: true,
        rewardAmount: decimal("100.00"),
        referred: { id: "u2", name: "Bob", createdAt: new Date("2026-01-01T00:00:00Z") },
      },
      {
        rewarded: false,
        rewardAmount: decimal("0.00"),
        referred: { id: "u3", name: null, createdAt: new Date("2026-02-01T00:00:00Z") },
      },
    ]);

    const dto = await referral.getSummary("u1");

    expect(dto.code).toBe("ABC123");
    expect(dto.referralCount).toBe(2);
    expect(dto.totalRewardEarned).toBe("100.00");
    expect(dto.referrals[0]).toEqual({
      id: "u2",
      name: "Bob",
      joinedAt: "2026-01-01T00:00:00.000Z",
      rewarded: true,
    });
  });

  it("throws 404 when the user is missing", async () => {
    p.user.findUnique.mockResolvedValue(null);
    p.referral.findMany.mockResolvedValue([]);
    await expect(referral.getSummary("gone")).rejects.toMatchObject({ status: 404 });
  });
});

describe("referral.applyReferralCode", () => {
  it("links the referrer and records the referral", async () => {
    p.user.findUnique
      .mockResolvedValueOnce({ id: "u1", referredById: null }) // the applying user
      .mockResolvedValueOnce({ id: "u2" }); // the referrer (by code)
    p.user.update.mockResolvedValue({});
    p.referral.create.mockResolvedValue({});

    await referral.applyReferralCode("u1", "ABC123");

    expect(p.user.update.mock.calls[0][0]).toMatchObject({
      where: { id: "u1" },
      data: { referredById: "u2" },
    });
    expect(p.referral.create.mock.calls[0][0].data).toEqual({ referrerId: "u2", referredId: "u1" });
  });

  it("rejects a user who already has a referrer (409)", async () => {
    p.user.findUnique.mockResolvedValueOnce({ id: "u1", referredById: "uX" });
    await expect(referral.applyReferralCode("u1", "ABC123")).rejects.toMatchObject({ status: 409 });
    expect(p.referral.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown referral code (400)", async () => {
    p.user.findUnique
      .mockResolvedValueOnce({ id: "u1", referredById: null })
      .mockResolvedValueOnce(null);
    await expect(referral.applyReferralCode("u1", "NOPE")).rejects.toMatchObject({ status: 400 });
  });

  it("rejects self-referral (400)", async () => {
    p.user.findUnique
      .mockResolvedValueOnce({ id: "u1", referredById: null })
      .mockResolvedValueOnce({ id: "u1" });
    await expect(referral.applyReferralCode("u1", "OWN")).rejects.toMatchObject({ status: 400 });
    expect(p.referral.create).not.toHaveBeenCalled();
  });
});

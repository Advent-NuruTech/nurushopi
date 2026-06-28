import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import request from "supertest";
import { prisma } from "@nuru/db";
import { signAccessToken, signAdminAccessToken } from "@nuru/auth/tokens";
import { createApp } from "../../src/app.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const app = createApp();
const decimal = (s: string) => ({ toString: () => s });

let userAuth: string;
let adminAuth: string;

beforeAll(async () => {
  const secret = process.env.JWT_ACCESS_SECRET as string;
  const userToken = await signAccessToken(
    { sub: "u1", email: "user@example.com" },
    { secret, ttlSeconds: 3600 },
  );
  const adminToken = await signAdminAccessToken(
    { sub: "a1", email: "admin@example.com", role: "SENIOR" },
    { secret, ttlSeconds: 3600 },
  );
  userAuth = `Bearer ${userToken}`;
  adminAuth = `Bearer ${adminToken}`;
});

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(p)
      : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("GET /api/v1/wallet", () => {
  it("requires authentication (401)", async () => {
    const res = await request(app).get("/api/v1/wallet");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns the wallet summary for a signed-in user", async () => {
    p.user.findUnique.mockResolvedValue({ walletBalance: decimal("250.00"), referralCode: "ABC123" });
    p.user.count.mockResolvedValue(2);
    p.walletRedemption.aggregate.mockResolvedValue({ _sum: { amount: null } });
    p.walletTransaction.aggregate.mockResolvedValue({ _sum: { amount: decimal("250.00") } });

    const res = await request(app).get("/api/v1/wallet").set("Authorization", userAuth);

    expect(res.status).toBe(200);
    expect(res.body.data.wallet.balance).toBe("250.00");
    expect(res.body.data.wallet.referralCode).toBe("ABC123");
  });
});

describe("POST /api/v1/wallet/redemptions", () => {
  it("rejects an amount below the minimum (400)", async () => {
    const res = await request(app)
      .post("/api/v1/wallet/redemptions")
      .set("Authorization", userAuth)
      .send({ amount: 50, method: "mpesa" });
    expect(res.status).toBe(400);
    expect(p.walletRedemption.create).not.toHaveBeenCalled();
  });

  it("creates a redemption and reserves funds (201)", async () => {
    p.walletRedemption.create.mockResolvedValue({
      id: "wr1",
      userId: "u1",
      amount: decimal("500.00"),
      status: "PENDING",
      method: "mpesa",
      details: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    p.user.findUnique.mockResolvedValue({ walletBalance: decimal("1000.00") });
    p.user.updateMany.mockResolvedValue({ count: 1 });
    p.walletTransaction.create.mockResolvedValue({});

    const res = await request(app)
      .post("/api/v1/wallet/redemptions")
      .set("Authorization", userAuth)
      .send({ amount: 500, method: "mpesa" });

    expect(res.status).toBe(201);
    expect(res.body.data.redemption.status).toBe("PENDING");
  });
});

describe("admin wallet guards", () => {
  it("rejects an unauthenticated redemption list with 401", async () => {
    const res = await request(app).get("/api/v1/admin/wallet/redemptions");
    expect(res.status).toBe(401);
  });

  it("rejects a user token on an admin route (401)", async () => {
    const res = await request(app)
      .get("/api/v1/admin/wallet/redemptions")
      .set("Authorization", userAuth);
    expect(res.status).toBe(401);
  });

  it("lets an admin list redemptions (200)", async () => {
    p.walletRedemption.count.mockResolvedValue(0);
    p.walletRedemption.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get("/api/v1/admin/wallet/redemptions")
      .set("Authorization", adminAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  it("lets an admin adjust a balance (201)", async () => {
    p.user.findUnique.mockResolvedValue({ walletBalance: decimal("100.00") });
    p.user.update.mockResolvedValue({});
    p.walletTransaction.create.mockResolvedValue({
      id: "wt1",
      userId: "u1",
      type: "CREDIT",
      source: "ADJUSTMENT",
      amount: decimal("50.00"),
      balanceAfter: decimal("150.00"),
      status: "APPROVED",
      orderId: null,
      redemptionId: null,
      metadata: { note: "goodwill" },
      createdAt: new Date(),
    });

    const res = await request(app)
      .post("/api/v1/admin/wallet/adjustments")
      .set("Authorization", adminAuth)
      .send({ userId: "ckabcdefghijklmnopqrstuvwx", type: "CREDIT", amount: 50, note: "goodwill" });

    expect(res.status).toBe(201);
    expect(res.body.data.transaction.balanceAfter).toBe("150.00");
  });
});

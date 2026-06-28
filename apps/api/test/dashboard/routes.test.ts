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
  userAuth = `Bearer ${await signAccessToken({ sub: "u1", email: "u@e.com" }, { secret, ttlSeconds: 3600 })}`;
  adminAuth = `Bearer ${await signAdminAccessToken({ sub: "a1", email: "a@e.com", role: "SENIOR" }, { secret, ttlSeconds: 3600 })}`;
});

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(p)
      : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("GET /api/v1/admin/dashboard", () => {
  it("rejects an unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/v1/admin/dashboard");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects a user token (admin only) with 401", async () => {
    const res = await request(app).get("/api/v1/admin/dashboard").set("Authorization", userAuth);
    expect(res.status).toBe(401);
  });

  it("returns the stats snapshot for an admin (200)", async () => {
    p.product.count.mockResolvedValue(0);
    p.user.count.mockResolvedValue(0);
    p.order.count.mockResolvedValue(0);
    p.order.groupBy.mockResolvedValue([]);
    p.order.aggregate.mockResolvedValue({ _sum: { total: null }, _count: { _all: 0 } });
    p.walletRedemption.aggregate.mockResolvedValue({ _sum: { amount: decimal("0.00") }, _count: { _all: 0 } });
    p.user.aggregate.mockResolvedValue({ _sum: { walletBalance: null } });
    p.order.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/v1/admin/dashboard").set("Authorization", adminAuth);

    expect(res.status).toBe(200);
    expect(res.body.data.stats.orders.total).toBe(0);
    expect(res.body.data.stats.revenue.paidTotal).toBe("0.00");
  });
});

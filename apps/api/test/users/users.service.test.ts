import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma, Prisma } from "@nuru/db";
import * as users from "../../src/modules/users/users.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "u1",
    email: "a@b.com",
    name: "Alice",
    phone: "0700",
    address: "Nairobi",
    isActive: true,
    walletBalance: new Prisma.Decimal(150),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
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

describe("users.list", () => {
  it("merges per-user order aggregates and excludes cancelled/refunded", async () => {
    p.user.findMany.mockResolvedValue([userRow(), userRow({ id: "u2", name: "Bob" })]);
    p.order.groupBy.mockResolvedValue([
      { userId: "u1", _count: { _all: 3 }, _sum: { total: new Prisma.Decimal(900) } },
    ]);

    const res = await users.list({ limit: 500 } as never);

    expect(res).toHaveLength(2);
    expect(res[0]).toMatchObject({
      id: "u1",
      totalOrders: 3,
      totalSpend: "900.00",
      walletBalance: "150.00",
    });
    // No orders → zeroed.
    expect(res[1]).toMatchObject({ id: "u2", totalOrders: 0, totalSpend: "0" });
    expect(p.order.groupBy.mock.calls[0][0].where.status).toEqual({ notIn: ["CANCELLED", "REFUNDED"] });
  });

  it("applies a case-insensitive search across name/email/phone", async () => {
    p.user.findMany.mockResolvedValue([]);
    await users.list({ limit: 500, search: "ali" } as never);
    const where = p.user.findMany.mock.calls[0][0].where;
    expect(where.OR).toHaveLength(3);
    expect(where.OR[0]).toEqual({ name: { contains: "ali", mode: "insensitive" } });
  });

  it("short-circuits the aggregate query when there are no users", async () => {
    p.user.findMany.mockResolvedValue([]);
    const res = await users.list({ limit: 500 } as never);
    expect(res).toEqual([]);
    expect(p.order.groupBy).not.toHaveBeenCalled();
  });
});

describe("users.getBundle", () => {
  it("404s for an unknown user", async () => {
    p.user.findUnique.mockResolvedValue(null);
    await expect(users.getBundle("nope")).rejects.toMatchObject({ status: 404 });
  });

  it("returns the profile with recent orders, ledger and redemptions", async () => {
    p.user.findUnique.mockResolvedValue(userRow());
    p.order.findMany.mockResolvedValue([]);
    p.walletTransaction.findMany.mockResolvedValue([]);
    p.walletRedemption.findMany.mockResolvedValue([]);
    p.order.aggregate.mockResolvedValue({ _count: { _all: 2 }, _sum: { total: new Prisma.Decimal(500) } });

    const bundle = await users.getBundle("u1");

    expect(bundle.user).toMatchObject({
      id: "u1",
      totalOrders: 2,
      totalSpend: "500.00",
      address: "Nairobi",
    });
    expect(bundle.orders).toEqual([]);
  });
});

describe("users.remove", () => {
  it("deletes an existing user", async () => {
    p.user.findUnique.mockResolvedValue({ id: "u1" });
    p.user.delete.mockResolvedValue({});
    await users.remove("u1");
    expect(p.user.delete).toHaveBeenCalledWith({ where: { id: "u1" } });
  });

  it("404s for a missing user", async () => {
    p.user.findUnique.mockResolvedValue(null);
    await expect(users.remove("gone")).rejects.toMatchObject({ status: 404 });
  });

  it("409s when FK history blocks deletion", async () => {
    p.user.findUnique.mockResolvedValue({ id: "u1" });
    p.user.delete.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("fk", { code: "P2003" }));
    await expect(users.remove("u1")).rejects.toMatchObject({ status: 409 });
  });
});

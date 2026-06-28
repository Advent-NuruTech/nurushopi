import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma } from "@nuru/db";
import * as dashboard from "../../src/modules/dashboard/dashboard.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const decimal = (s: string) => ({ toString: () => s });

const orderRow = {
  id: "o1",
  orderNumber: "ord_abc",
  userId: null,
  status: "PENDING",
  paymentStatus: "UNPAID",
  subtotal: decimal("39.98"),
  walletApplied: decimal("0.00"),
  total: decimal("39.98"),
  contactName: "Jane",
  contactPhone: "+254700000000",
  contactEmail: null,
  address: "123 St",
  note: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: "oi1",
      orderId: "o1",
      productId: "p1",
      productName: "Widget",
      unitPrice: decimal("19.99"),
      quantity: 2,
      imageUrl: "https://img/1",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(p)
      : Promise.all(arg as Promise<unknown>[]),
  );
});

function primeStats() {
  // product.count is called 4×, in array order: total, active, lowStock, outOfStock.
  p.product.count
    .mockResolvedValueOnce(50)
    .mockResolvedValueOnce(45)
    .mockResolvedValueOnce(5)
    .mockResolvedValueOnce(3);
  p.user.count.mockResolvedValue(120);
  p.order.count.mockResolvedValue(200);
  p.order.groupBy.mockResolvedValue([
    { status: "PENDING", _count: { _all: 10 } },
    { status: "PROCESSING", _count: { _all: 5 } },
    { status: "DELIVERED", _count: { _all: 150 } },
  ]);
  p.order.aggregate.mockResolvedValue({ _sum: { total: decimal("99999.00") }, _count: { _all: 150 } });
  p.walletRedemption.aggregate.mockResolvedValue({ _sum: { amount: decimal("500.00") }, _count: { _all: 2 } });
  p.user.aggregate.mockResolvedValue({ _sum: { walletBalance: decimal("3000.00") } });
  p.order.findMany.mockResolvedValue([orderRow]);
}

describe("dashboard.getStats", () => {
  it("assembles a consistent snapshot from batched reads", async () => {
    primeStats();
    const stats = await dashboard.getStats();

    expect(stats.revenue).toEqual({ paidTotal: "99999.00", paidOrders: 150 });
    expect(stats.catalog).toEqual({ products: 50, activeProducts: 45, lowStock: 5, outOfStock: 3 });
    expect(stats.customers).toEqual({ total: 120 });
    expect(stats.wallet).toEqual({
      pendingRedemptions: 2,
      pendingRedemptionAmount: "500.00",
      outstandingBalance: "3000.00",
    });
  });

  it("zero-fills every order status and computes pendingFulfilment", async () => {
    primeStats();
    const stats = await dashboard.getStats();

    expect(stats.orders.total).toBe(200);
    expect(stats.orders.byStatus.PENDING).toBe(10);
    expect(stats.orders.byStatus.PROCESSING).toBe(5);
    expect(stats.orders.byStatus.DELIVERED).toBe(150);
    // statuses with no orders are present as 0, not undefined
    expect(stats.orders.byStatus.CANCELLED).toBe(0);
    expect(stats.orders.byStatus.REFUNDED).toBe(0);
    // PENDING + CONFIRMED + PROCESSING = 10 + 0 + 5
    expect(stats.orders.pendingFulfilment).toBe(15);
  });

  it("serialises recent orders through the order DTO", async () => {
    primeStats();
    const stats = await dashboard.getStats();
    expect(stats.recentOrders).toHaveLength(1);
    expect(stats.recentOrders[0]?.orderNumber).toBe("ord_abc");
    expect(stats.recentOrders[0]?.items[0]?.lineTotal).toBe("39.98");
  });

  it("defaults null money aggregates to zero", async () => {
    p.product.count.mockResolvedValue(0);
    p.user.count.mockResolvedValue(0);
    p.order.count.mockResolvedValue(0);
    p.order.groupBy.mockResolvedValue([]);
    p.order.aggregate.mockResolvedValue({ _sum: { total: null }, _count: { _all: 0 } });
    p.walletRedemption.aggregate.mockResolvedValue({ _sum: { amount: null }, _count: { _all: 0 } });
    p.user.aggregate.mockResolvedValue({ _sum: { walletBalance: null } });
    p.order.findMany.mockResolvedValue([]);

    const stats = await dashboard.getStats();
    expect(stats.revenue.paidTotal).toBe("0.00");
    expect(stats.wallet.outstandingBalance).toBe("0.00");
    expect(stats.wallet.pendingRedemptionAmount).toBe("0.00");
    expect(stats.recentOrders).toEqual([]);
  });
});

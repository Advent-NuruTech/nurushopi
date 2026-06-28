import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma } from "@nuru/db";
import * as orders from "../../src/modules/orders/orders.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const decimal = (s: string) => ({ toString: () => s });

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    name: "Widget",
    slug: "widget",
    price: decimal("19.99"),
    sellingPrice: null,
    images: ["https://img/1"],
    stock: 10,
    isActive: true,
    ...overrides,
  };
}

function orderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "o1",
    orderNumber: "ord_abc",
    userId: null,
    status: "PENDING",
    paymentStatus: "UNPAID",
    subtotal: decimal("59.97"),
    walletApplied: decimal("0.00"),
    total: decimal("59.97"),
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
        quantity: 3,
        imageUrl: "https://img/1",
      },
    ],
    ...overrides,
  };
}

const validCheckout = {
  items: [{ productId: "p1", quantity: 3 }],
  contactName: "Jane",
  contactPhone: "+254700000000",
  address: "123 St",
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function" ? (arg as (tx: unknown) => unknown)(p) : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("orders.checkout", () => {
  it("prices from the live product, decrements stock and persists the order", async () => {
    p.product.findMany.mockResolvedValue([product()]);
    p.product.updateMany.mockResolvedValue({ count: 1 });
    p.order.create.mockResolvedValue(orderRow());

    const dto = await orders.checkout(validCheckout, "user1");

    // Stock decremented by the requested quantity, guarded by a stock floor.
    expect(p.product.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", stock: { gte: 3 } },
      data: { stock: { decrement: 3 } },
    });

    // Subtotal computed server-side: 19.99 * 3 = 59.97.
    const created = p.order.create.mock.calls[0][0].data;
    expect(created.subtotal.toString()).toBe("59.97");
    expect(created.total.toString()).toBe("59.97");
    expect(created.walletApplied.toString()).toBe("0.00");
    expect(created.userId).toBe("user1");
    expect(dto.orderNumber).toBe("ord_abc");
  });

  it("snapshots name + first image and charges sellingPrice when set", async () => {
    p.product.findMany.mockResolvedValue([
      product({ sellingPrice: decimal("15.00"), name: "Widget Pro" }),
    ]);
    p.product.updateMany.mockResolvedValue({ count: 1 });
    p.order.create.mockResolvedValue(orderRow());

    await orders.checkout(validCheckout);

    const line = p.order.create.mock.calls[0][0].data.items.create[0];
    expect(line.productName).toBe("Widget Pro");
    expect(line.imageUrl).toBe("https://img/1");
    expect(line.unitPrice.toString()).toBe("15.00");
    // 15.00 * 3 = 45.00 subtotal
    expect(p.order.create.mock.calls[0][0].data.subtotal.toString()).toBe("45.00");
  });

  it("aggregates duplicate product lines before checking stock", async () => {
    p.product.findMany.mockResolvedValue([product({ stock: 5 })]);
    p.product.updateMany.mockResolvedValue({ count: 1 });
    p.order.create.mockResolvedValue(orderRow());

    await orders.checkout({
      ...validCheckout,
      items: [
        { productId: "p1", quantity: 2 },
        { productId: "p1", quantity: 2 },
      ],
    } as never);

    // Combined quantity (4) is what gets decremented, in a single update.
    expect(p.product.updateMany).toHaveBeenCalledTimes(1);
    expect(p.product.updateMany.mock.calls[0][0].data).toEqual({ stock: { decrement: 4 } });
  });

  it("rejects a product that is missing from the catalog (400)", async () => {
    p.product.findMany.mockResolvedValue([]); // nothing found
    await expect(orders.checkout(validCheckout)).rejects.toMatchObject({ status: 400 });
    expect(p.order.create).not.toHaveBeenCalled();
  });

  it("rejects an inactive product (400)", async () => {
    p.product.findMany.mockResolvedValue([product({ isActive: false })]);
    await expect(orders.checkout(validCheckout)).rejects.toMatchObject({ status: 400 });
    expect(p.order.create).not.toHaveBeenCalled();
  });

  it("rejects insufficient stock with a 409 conflict", async () => {
    p.product.findMany.mockResolvedValue([product({ stock: 1 })]);
    await expect(orders.checkout(validCheckout)).rejects.toMatchObject({ status: 409 });
    expect(p.product.updateMany).not.toHaveBeenCalled();
  });

  it("maps a lost stock race (conditional update miss) to a 409", async () => {
    p.product.findMany.mockResolvedValue([product({ stock: 10 })]);
    p.product.updateMany.mockResolvedValue({ count: 0 }); // someone drained it first
    await expect(orders.checkout(validCheckout)).rejects.toMatchObject({ status: 409 });
    expect(p.order.create).not.toHaveBeenCalled();
  });

  it("applies wallet credit server-side and debits the ledger when opted in", async () => {
    p.product.findMany.mockResolvedValue([product()]); // 19.99 * 3 = 59.97
    p.product.updateMany.mockResolvedValue({ count: 1 });
    // Live balance (20.00) is less than the subtotal, so the whole balance applies.
    p.user.findUnique.mockResolvedValue({ walletBalance: decimal("20.00") });
    p.user.updateMany.mockResolvedValue({ count: 1 });
    p.walletTransaction.create.mockResolvedValue({});
    p.referral.findUnique.mockResolvedValue(null);
    p.order.create.mockResolvedValue(orderRow());

    await orders.checkout({ ...validCheckout, useWallet: true } as never, "user1");

    const created = p.order.create.mock.calls[0][0].data;
    expect(created.walletApplied.toString()).toBe("20.00");
    expect(created.total.toString()).toBe("39.97"); // 59.97 - 20.00
    // A DEBIT/REDEEM ledger row was written, linked to the new order.
    const ledger = p.walletTransaction.create.mock.calls[0][0].data;
    expect(ledger.type).toBe("DEBIT");
    expect(ledger.source).toBe("REDEEM");
    expect(p.user.updateMany).toHaveBeenCalledTimes(1);
  });

  it("ignores wallet credit for a guest checkout (no user)", async () => {
    p.product.findMany.mockResolvedValue([product()]);
    p.product.updateMany.mockResolvedValue({ count: 1 });
    p.order.create.mockResolvedValue(orderRow());

    await orders.checkout({ ...validCheckout, useWallet: true } as never);

    const created = p.order.create.mock.calls[0][0].data;
    expect(created.walletApplied.toString()).toBe("0.00");
    expect(p.walletTransaction.create).not.toHaveBeenCalled();
  });

  it("rewards the referrer when a referred user places their first order", async () => {
    p.product.findMany.mockResolvedValue([product()]);
    p.product.updateMany.mockResolvedValue({ count: 1 });
    p.order.create.mockResolvedValue(orderRow());
    p.referral.findUnique.mockResolvedValue({
      id: "ref1",
      referrerId: "refUser",
      referredId: "user1",
      rewarded: false,
    });
    p.order.count.mockResolvedValue(1); // the order just created is their first
    p.referral.update.mockResolvedValue({});
    p.user.findUnique.mockResolvedValue({ walletBalance: decimal("0.00") });
    p.user.update.mockResolvedValue({});
    p.walletTransaction.create.mockResolvedValue({});

    await orders.checkout(validCheckout, "user1");

    expect(p.referral.update).toHaveBeenCalledTimes(1);
    expect(p.referral.update.mock.calls[0][0].data.rewarded).toBe(true);
    // An AFFILIATE credit was paid to the referrer, not the buyer.
    const ledger = p.walletTransaction.create.mock.calls[0][0].data;
    expect(ledger.userId).toBe("refUser");
    expect(ledger.type).toBe("CREDIT");
    expect(ledger.source).toBe("AFFILIATE");
  });

  it("does not reward an already-rewarded referral", async () => {
    p.product.findMany.mockResolvedValue([product()]);
    p.product.updateMany.mockResolvedValue({ count: 1 });
    p.order.create.mockResolvedValue(orderRow());
    p.referral.findUnique.mockResolvedValue({ id: "ref1", rewarded: true });

    await orders.checkout(validCheckout, "user1");

    expect(p.referral.update).not.toHaveBeenCalled();
    expect(p.walletTransaction.create).not.toHaveBeenCalled();
  });
});

describe("orders.getByOrderNumber", () => {
  it("returns the order when found", async () => {
    p.order.findUnique.mockResolvedValue(orderRow());
    const dto = await orders.getByOrderNumber("ord_abc");
    expect(dto.orderNumber).toBe("ord_abc");
    expect(dto.itemCount).toBe(3);
  });

  it("throws 404 for an unknown order number", async () => {
    p.order.findUnique.mockResolvedValue(null);
    await expect(orders.getByOrderNumber("nope")).rejects.toMatchObject({ status: 404 });
  });
});

describe("orders.adminList", () => {
  it("returns a paginated envelope and maps total_desc sort", async () => {
    p.order.count.mockResolvedValue(3);
    p.order.findMany.mockResolvedValue([orderRow()]);

    const res = await orders.adminList({ page: 2, pageSize: 1, sort: "total_desc" } as never);

    expect(res.total).toBe(3);
    expect(res.totalPages).toBe(3);
    const args = p.order.findMany.mock.calls[0][0];
    expect(args.skip).toBe(1);
    expect(args.take).toBe(1);
    expect(args.orderBy).toEqual({ total: "desc" });
  });
});

describe("orders.listForUser", () => {
  it("forces the userId scope regardless of query", async () => {
    p.order.count.mockResolvedValue(0);
    p.order.findMany.mockResolvedValue([]);

    await orders.listForUser("user1", { page: 1, pageSize: 20, sort: "newest", userId: "someone-else" } as never);

    expect(p.order.findMany.mock.calls[0][0].where.userId).toBe("user1");
  });
});

describe("orders.updateStatus", () => {
  it("restores stock when an order enters CANCELLED", async () => {
    p.order.findUnique.mockResolvedValue(orderRow({ status: "PROCESSING" }));
    p.product.updateMany.mockResolvedValue({ count: 1 });
    p.order.update.mockResolvedValue(orderRow({ status: "CANCELLED" }));

    await orders.updateStatus("o1", "CANCELLED");

    expect(p.product.updateMany).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { stock: { increment: 3 } },
    });
  });

  it("does not double-restore stock for an already-cancelled order", async () => {
    p.order.findUnique.mockResolvedValue(orderRow({ status: "CANCELLED" }));
    p.order.update.mockResolvedValue(orderRow({ status: "CANCELLED" }));

    await orders.updateStatus("o1", "CANCELLED");

    expect(p.product.updateMany).not.toHaveBeenCalled();
  });

  it("refunds wallet credit when a wallet-paid order is cancelled", async () => {
    p.order.findUnique.mockResolvedValue(
      orderRow({ status: "PROCESSING", userId: "user1", walletApplied: decimal("20.00") }),
    );
    p.product.updateMany.mockResolvedValue({ count: 1 });
    p.user.findUnique.mockResolvedValue({ walletBalance: decimal("0.00") });
    p.user.update.mockResolvedValue({});
    p.walletTransaction.create.mockResolvedValue({});
    p.order.update.mockResolvedValue(orderRow({ status: "CANCELLED" }));

    await orders.updateStatus("o1", "CANCELLED");

    const ledger = p.walletTransaction.create.mock.calls[0][0].data;
    expect(ledger.userId).toBe("user1");
    expect(ledger.type).toBe("CREDIT");
    expect(ledger.source).toBe("REFUND");
  });

  it("does not touch stock for a non-cancel transition", async () => {
    p.order.findUnique.mockResolvedValue(orderRow({ status: "PENDING" }));
    p.order.update.mockResolvedValue(orderRow({ status: "SHIPPED" }));

    await orders.updateStatus("o1", "SHIPPED");

    expect(p.product.updateMany).not.toHaveBeenCalled();
  });

  it("throws 404 for a missing order", async () => {
    p.order.findUnique.mockResolvedValue(null);
    await expect(orders.updateStatus("gone", "SHIPPED")).rejects.toMatchObject({ status: 404 });
  });
});

describe("orders.updatePayment", () => {
  it("updates payment status when the order exists", async () => {
    p.order.findUnique.mockResolvedValue({ id: "o1" });
    p.order.update.mockResolvedValue(orderRow({ paymentStatus: "PAID" }));

    const dto = await orders.updatePayment("o1", "PAID");
    expect(dto.paymentStatus).toBe("PAID");
    expect(p.order.update.mock.calls[0][0].data).toEqual({ paymentStatus: "PAID" });
  });

  it("throws 404 for a missing order", async () => {
    p.order.findUnique.mockResolvedValue(null);
    await expect(orders.updatePayment("gone", "PAID")).rejects.toMatchObject({ status: 404 });
  });
});

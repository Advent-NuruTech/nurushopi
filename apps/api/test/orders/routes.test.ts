import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import request from "supertest";
import { prisma } from "@nuru/db";
import { createApp } from "../../src/app.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const app = createApp();
const decimal = (s: string) => ({ toString: () => s });
const cuid = "ckabcdefghijklmnopqrstuvwx";

const productRow = {
  id: cuid,
  name: "Widget",
  slug: "widget",
  price: decimal("19.99"),
  sellingPrice: null,
  images: ["https://img/1"],
  stock: 10,
  isActive: true,
};

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
      productId: cuid,
      productName: "Widget",
      unitPrice: decimal("19.99"),
      quantity: 2,
      imageUrl: "https://img/1",
    },
  ],
};

const validBody = {
  items: [{ productId: cuid, quantity: 2 }],
  contactName: "Jane",
  contactPhone: "+254700000000",
  address: "123 St",
};

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function" ? (arg as (tx: unknown) => unknown)(p) : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("POST /api/v1/orders/checkout", () => {
  it("creates an order for a guest (201)", async () => {
    p.product.findMany.mockResolvedValue([productRow]);
    p.product.updateMany.mockResolvedValue({ count: 1 });
    p.order.create.mockResolvedValue(orderRow);

    const res = await request(app).post("/api/v1/orders/checkout").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.order.orderNumber).toBe("ord_abc");
    expect(res.body.data.order.items[0].lineTotal).toBe("39.98");
  });

  it("rejects an empty cart with a 400 validation error", async () => {
    const res = await request(app)
      .post("/api/v1/orders/checkout")
      .send({ ...validBody, items: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(p.order.create).not.toHaveBeenCalled();
  });

  it("surfaces an out-of-stock conflict as 409", async () => {
    p.product.findMany.mockResolvedValue([{ ...productRow, stock: 0 }]);
    const res = await request(app).post("/api/v1/orders/checkout").send(validBody);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });
});

describe("GET /api/v1/orders/:orderNumber", () => {
  it("returns the tracked order", async () => {
    p.order.findUnique.mockResolvedValue(orderRow);
    const res = await request(app).get("/api/v1/orders/ord_abc");
    expect(res.status).toBe(200);
    expect(res.body.data.order.orderNumber).toBe("ord_abc");
  });

  it("returns 404 for an unknown order number", async () => {
    p.order.findUnique.mockResolvedValue(null);
    const res = await request(app).get("/api/v1/orders/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/v1/orders/mine", () => {
  it("requires authentication (401)", async () => {
    const res = await request(app).get("/api/v1/orders/mine");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("admin order guards", () => {
  it("rejects an unauthenticated order list with 401", async () => {
    const res = await request(app).get("/api/v1/admin/orders");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects an unauthenticated status update with 401", async () => {
    const res = await request(app)
      .patch("/api/v1/admin/orders/o1/status")
      .send({ status: "SHIPPED" });
    expect(res.status).toBe(401);
    expect(p.order.update).not.toHaveBeenCalled();
  });
});

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

const itemRow = {
  id: "w1",
  name: "Bulk Sugar",
  slug: "bulk-sugar",
  description: null,
  unitPrice: decimal("2500.00"),
  minQuantity: 10,
  images: [],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
});

describe("GET /api/v1/wholesale/items", () => {
  it("returns a paginated item list", async () => {
    p.wholesaleItem.count.mockResolvedValue(1);
    p.wholesaleItem.findMany.mockResolvedValue([itemRow]);

    const res = await request(app).get("/api/v1/wholesale/items");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].unitPrice).toBe("2500.00");
    expect(res.body.data.items[0].minQuantity).toBe(10);
    expect(res.body.data.total).toBe(1);
  });

  it("rejects invalid pagination with a 400 validation error", async () => {
    const res = await request(app).get("/api/v1/wholesale/items?page=0");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/v1/wholesale/items/:id", () => {
  it("returns 404 for an unknown item", async () => {
    p.wholesaleItem.findFirst.mockResolvedValue(null);
    const res = await request(app).get("/api/v1/wholesale/items/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("returns the item when found", async () => {
    p.wholesaleItem.findFirst.mockResolvedValue(itemRow);
    const res = await request(app).get("/api/v1/wholesale/items/bulk-sugar");
    expect(res.status).toBe(200);
    expect(res.body.data.item.slug).toBe("bulk-sugar");
  });
});

describe("admin wholesale guards", () => {
  it("rejects unauthenticated item creation with 401", async () => {
    const res = await request(app)
      .post("/api/v1/admin/wholesale/items")
      .send({ name: "x", unitPrice: 1 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(p.wholesaleItem.create).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated deletes with 401", async () => {
    const res = await request(app).delete("/api/v1/admin/wholesale/items/w1");
    expect(res.status).toBe(401);
    expect(p.wholesaleItem.delete).not.toHaveBeenCalled();
  });
});

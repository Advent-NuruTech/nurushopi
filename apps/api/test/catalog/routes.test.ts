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

const productRow = {
  id: "p1",
  name: "Widget",
  slug: "widget",
  description: null,
  shortDescription: null,
  price: decimal("10.00"),
  originalPrice: null,
  sellingPrice: null,
  images: [],
  stock: 4,
  isActive: true,
  isFeatured: false,
  categoryId: null,
  createdById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
});

describe("GET /api/v1/catalog/products", () => {
  it("returns a paginated product list", async () => {
    p.product.count.mockResolvedValue(1);
    p.product.findMany.mockResolvedValue([productRow]);

    const res = await request(app).get("/api/v1/catalog/products");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].price).toBe("10.00");
    expect(res.body.data.total).toBe(1);
  });

  it("rejects invalid pagination with a 400 validation error", async () => {
    const res = await request(app).get("/api/v1/catalog/products?page=0");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/v1/catalog/products/:id", () => {
  it("returns 404 for an unknown product", async () => {
    p.product.findFirst.mockResolvedValue(null);
    const res = await request(app).get("/api/v1/catalog/products/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/v1/catalog/categories", () => {
  it("returns the category list", async () => {
    p.category.findMany.mockResolvedValue([
      {
        id: "c1",
        name: "Tools",
        slug: "tools",
        icon: null,
        description: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const res = await request(app).get("/api/v1/catalog/categories");
    expect(res.status).toBe(200);
    expect(res.body.data.categories[0].slug).toBe("tools");
  });
});

describe("admin catalog guards", () => {
  it("rejects unauthenticated product creation with 401", async () => {
    const res = await request(app)
      .post("/api/v1/admin/catalog/products")
      .send({ name: "x", price: 1 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(p.product.create).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated deletes with 401", async () => {
    const res = await request(app).delete("/api/v1/admin/catalog/products/p1");
    expect(res.status).toBe(401);
  });
});

describe("unknown routes", () => {
  it("returns the 404 envelope", async () => {
    const res = await request(app).get("/api/v1/catalog/nope");
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma, Prisma } from "@nuru/db";
import * as products from "../../src/modules/catalog/product.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const decimal = (s: string) => ({ toString: () => s });

function row(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
});

describe("product.list", () => {
  it("returns a paginated envelope and enforces active filter for public", async () => {
    p.product.count.mockResolvedValue(1);
    p.product.findMany.mockResolvedValue([row()]);

    const res = await products.list(
      { page: 1, pageSize: 20, sort: "newest" } as never,
      { enforceActive: true },
    );

    expect(res.total).toBe(1);
    expect(res.totalPages).toBe(1);
    expect(res.items[0]?.price).toBe("10.00");
    expect(p.product.findMany.mock.calls[0][0].where.isActive).toBe(true);
  });

  it("computes skip from page/pageSize", async () => {
    p.product.count.mockResolvedValue(40);
    p.product.findMany.mockResolvedValue([]);

    await products.list(
      { page: 3, pageSize: 10, sort: "price_asc" } as never,
      { enforceActive: false },
    );

    const args = p.product.findMany.mock.calls[0][0];
    expect(args.skip).toBe(20);
    expect(args.take).toBe(10);
    expect(args.orderBy).toEqual({ price: "asc" });
  });
});

describe("product.getByIdOrSlug", () => {
  it("throws 404 when not found", async () => {
    p.product.findFirst.mockResolvedValue(null);
    await expect(
      products.getByIdOrSlug("nope", { activeOnly: true }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("product.create", () => {
  it("auto-generates a slug and persists", async () => {
    p.product.findUnique.mockResolvedValue(null); // slug free
    p.product.create.mockResolvedValue(row({ name: "Cool Thing", slug: "cool-thing" }));

    await products.create({ name: "Cool Thing", price: 5, images: [] } as never);

    expect(p.product.create.mock.calls[0][0].data.slug).toBe("cool-thing");
  });

  it("rejects an unknown category", async () => {
    p.category.findUnique.mockResolvedValue(null);
    await expect(
      products.create({ name: "x", price: 1, images: [], categoryId: "missing" } as never),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("product.remove", () => {
  it("maps Prisma P2025 to a 404", async () => {
    p.product.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("not found", { code: "P2025" } as never),
    );
    await expect(products.remove("gone")).rejects.toMatchObject({ status: 404 });
  });
});

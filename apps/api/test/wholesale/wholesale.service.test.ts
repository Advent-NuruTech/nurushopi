import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma, Prisma } from "@nuru/db";
import * as items from "../../src/modules/wholesale/wholesale.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const decimal = (s: string) => ({ toString: () => s });

function row(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
});

describe("wholesale.list", () => {
  it("returns a paginated envelope and enforces active for public", async () => {
    p.wholesaleItem.count.mockResolvedValue(1);
    p.wholesaleItem.findMany.mockResolvedValue([row()]);

    const res = await items.list(
      { page: 1, pageSize: 20, sort: "newest" } as never,
      { enforceActive: true },
    );

    expect(res.total).toBe(1);
    expect(res.totalPages).toBe(1);
    expect(res.items[0]?.unitPrice).toBe("2500.00");
    expect(p.wholesaleItem.findMany.mock.calls[0][0].where.isActive).toBe(true);
  });

  it("computes skip/take and maps price sort to unitPrice", async () => {
    p.wholesaleItem.count.mockResolvedValue(40);
    p.wholesaleItem.findMany.mockResolvedValue([]);

    await items.list(
      { page: 3, pageSize: 10, sort: "price_asc" } as never,
      { enforceActive: false },
    );

    const args = p.wholesaleItem.findMany.mock.calls[0][0];
    expect(args.skip).toBe(20);
    expect(args.take).toBe(10);
    expect(args.orderBy).toEqual({ unitPrice: "asc" });
  });

  it("builds a minQuantity floor filter", async () => {
    p.wholesaleItem.count.mockResolvedValue(0);
    p.wholesaleItem.findMany.mockResolvedValue([]);

    await items.list(
      { page: 1, pageSize: 20, sort: "newest", minQuantity: 5 } as never,
      { enforceActive: true },
    );

    expect(p.wholesaleItem.findMany.mock.calls[0][0].where.minQuantity).toEqual({ gte: 5 });
  });
});

describe("wholesale.getByIdOrSlug", () => {
  it("throws 404 when not found", async () => {
    p.wholesaleItem.findFirst.mockResolvedValue(null);
    await expect(
      items.getByIdOrSlug("nope", { activeOnly: true }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("wholesale.create", () => {
  it("auto-generates a slug and persists", async () => {
    p.wholesaleItem.findUnique.mockResolvedValue(null); // slug free
    p.wholesaleItem.create.mockResolvedValue(row({ name: "Bulk Maize", slug: "bulk-maize" }));

    await items.create({ name: "Bulk Maize", unitPrice: 5, minQuantity: 1, images: [] } as never);

    expect(p.wholesaleItem.create.mock.calls[0][0].data.slug).toBe("bulk-maize");
  });

  it("appends a counter when the slug collides", async () => {
    const taken = new Set(["bulk-maize"]);
    p.wholesaleItem.findUnique.mockImplementation(({ where }: { where: { slug: string } }) =>
      Promise.resolve(taken.has(where.slug) ? { id: "other" } : null),
    );
    p.wholesaleItem.create.mockResolvedValue(row());

    await items.create({ name: "Bulk Maize", unitPrice: 5, minQuantity: 1, images: [] } as never);

    expect(p.wholesaleItem.create.mock.calls[0][0].data.slug).toBe("bulk-maize-2");
  });
});

describe("wholesale.update", () => {
  it("throws 404 for a missing item", async () => {
    p.wholesaleItem.findUnique.mockResolvedValue(null);
    await expect(items.update("gone", { name: "x" } as never)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("wholesale.remove", () => {
  it("maps Prisma P2025 to a 404", async () => {
    p.wholesaleItem.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("not found", { code: "P2025" } as never),
    );
    await expect(items.remove("gone")).rejects.toMatchObject({ status: 404 });
  });
});

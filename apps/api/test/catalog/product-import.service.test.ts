import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma } from "@nuru/db";
import { importProducts } from "../../src/modules/catalog/product-import.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(p)
      : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("product import", () => {
  it("returns row-level validation errors instead of aborting the import request", async () => {
    const result = await importProducts(
      {
        duplicateStrategy: "update",
        rows: [{ channel: "retail", name: "", sku: "", price: null, stock: -1 }],
      },
      { kind: "admin", id: "a1" },
    );

    expect(result).toMatchObject({ total: 1, failed: 1, created: 0, updated: 0 });
    expect(result.results[0]?.error).toContain("name");
    expect(p.product.create).not.toHaveBeenCalled();
  });

  it("atomically creates retail and wholesale inventory and assigns retail merchandising", async () => {
    p.merchandisingCollection.findMany.mockResolvedValue([{ id: "c1", key: "new_arrivals" }]);
    p.product.findUnique.mockResolvedValue(null);
    p.product.create.mockResolvedValue({ id: "p1" });
    p.wholesaleItem.findUnique.mockResolvedValue(null);
    p.wholesaleItem.create.mockResolvedValue({ id: "w1" });
    p.collectionMembership.findUnique.mockResolvedValue(null);
    p.collectionMembership.aggregate.mockResolvedValue({ _max: { rank: 2 } });
    p.collectionMembership.upsert.mockResolvedValue({ id: "m1" });
    p.merchandisingCollection.update.mockResolvedValue({});
    p.adminLog.create.mockResolvedValue({});

    const result = await importProducts(
      {
        duplicateStrategy: "update",
        rows: [
          {
            channel: "both",
            name: "Nuru Honey",
            sku: "HONEY-500",
            price: 850,
            wholesalePrice: 700,
            minQuantity: 6,
            stock: 24,
            lowStockThreshold: 5,
            categoryId: null,
            brandName: null,
            storeName: null,
            description: null,
            images: [],
            collectionKeys: ["new_arrivals"],
            isActive: true,
          },
        ],
      },
      { kind: "admin", id: "a1" },
    );

    expect(result).toMatchObject({ total: 1, created: 1, failed: 0 });
    expect(p.product.create.mock.calls[0][0].data).toMatchObject({
      sku: "HONEY-500",
      createdById: "a1",
    });
    expect(p.wholesaleItem.create.mock.calls[0][0].data).toMatchObject({
      sku: "HONEY-500",
      unitPrice: 700,
    });
    expect(p.collectionMembership.upsert.mock.calls[0][0].create).toMatchObject({
      collectionId: "c1",
      productId: "p1",
      rank: 3,
    });
  });

  it("reports a vendor ownership violation without changing the other seller's product", async () => {
    p.product.findUnique.mockResolvedValue({ id: "p-other", vendorId: "vendor-other" });

    const result = await importProducts(
      {
        duplicateStrategy: "update",
        rows: [
          {
            channel: "retail",
            name: "Shared SKU",
            sku: "SHARED-1",
            price: 100,
            wholesalePrice: null,
            minQuantity: 1,
            stock: 1,
            lowStockThreshold: 5,
            categoryId: null,
            brandName: null,
            storeName: null,
            description: null,
            images: [],
            collectionKeys: [],
            isActive: true,
          },
        ],
      },
      { kind: "vendor", id: "vendor-1" },
    );

    expect(result).toMatchObject({ total: 1, failed: 1, created: 0, updated: 0 });
    expect(result.results[0]?.error).toContain("another seller");
    expect(p.product.update).not.toHaveBeenCalled();
  });
});

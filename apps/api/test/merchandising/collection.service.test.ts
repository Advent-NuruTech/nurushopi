import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma } from "@nuru/db";
import { decodeCursor, encodeCursor } from "../../src/modules/merchandising/cursor.js";
import {
  changeCollectionLifecycle,
  importCurrentProducts,
  reorderHomepageSections,
  updateCollection,
} from "../../src/modules/merchandising/merchandising.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const collection = {
  id: "c1",
  key: "flash_sale",
  displayName: "Nuru Rush",
  shortName: null,
  description: null,
  collectionType: "flash_sale",
  selectionStrategy: "promotion",
  status: "ACTIVE",
  priority: 1,
  placement: null,
  startAt: null,
  endAt: null,
  maxProducts: 12,
  sortStrategy: "rank",
  eligibilityRules: null,
  configuration: null,
  imageUrl: null,
  icon: null,
  badgeText: null,
  ctaText: null,
  ctaUrl: null,
  isPersonalized: false,
  isSponsored: false,
  cacheVersion: 1,
  createdById: "a1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(p)
      : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("collection identity", () => {
  it("renames presentation while preserving the immutable key and audit identity", async () => {
    p.merchandisingCollection.findUnique.mockResolvedValue(collection);
    p.merchandisingCollection.update.mockResolvedValue({
      ...collection,
      displayName: "Weekend Rush",
      cacheVersion: 2,
    });
    p.adminLog.create.mockResolvedValue({});

    const result = await updateCollection("c1", { displayName: "Weekend Rush" }, "a1");

    expect(result.key).toBe("flash_sale");
    expect(result.displayName).toBe("Weekend Rush");
    const data = p.merchandisingCollection.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("key");
    expect(data.cacheVersion).toEqual({ increment: 1 });
    expect(p.adminLog.create.mock.calls[0][0].data.metadata.immutableKey).toBe("flash_sale");
  });
});

describe("admin merchandising workflow", () => {
  it("publishes the collection and homepage placement together", async () => {
    p.merchandisingCollection.findUnique.mockResolvedValue({ ...collection, status: "DRAFT" });
    p.homepageSection.count.mockResolvedValue(1);
    p.collectionMembership.count.mockResolvedValue(2);
    p.merchandisingCollection.update.mockResolvedValue({ ...collection, status: "ACTIVE" });
    p.homepageSection.updateMany.mockResolvedValue({ count: 1 });
    p.adminLog.create.mockResolvedValue({});

    const result = await changeCollectionLifecycle("c1", { action: "PUBLISH" }, "a1");

    expect(result.status).toBe("ACTIVE");
    expect(p.merchandisingCollection.update.mock.calls[0][0].data.status).toBe("ACTIVE");
    expect(p.homepageSection.updateMany.mock.calls[0][0]).toMatchObject({
      where: { collectionId: "c1" },
      data: { status: "ACTIVE" },
    });
  });

  it("does not publish an empty collection", async () => {
    p.merchandisingCollection.findUnique.mockResolvedValue({ ...collection, status: "DRAFT" });
    p.homepageSection.count.mockResolvedValue(1);
    p.collectionMembership.count.mockResolvedValue(0);

    await expect(changeCollectionLifecycle("c1", { action: "PUBLISH" }, "a1")).rejects.toThrow(
      "Import at least one active, in-stock product",
    );
    expect(p.merchandisingCollection.update).not.toHaveBeenCalled();
  });

  it("always allows an active collection to be unpublished", async () => {
    p.merchandisingCollection.findUnique.mockResolvedValue({
      ...collection,
      startAt: new Date("2026-02-02T00:00:00.000Z"),
      endAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    p.homepageSection.count.mockResolvedValue(1);
    p.merchandisingCollection.update.mockResolvedValue({ ...collection, status: "PAUSED" });
    p.homepageSection.updateMany.mockResolvedValue({ count: 1 });
    p.adminLog.create.mockResolvedValue({});

    const result = await changeCollectionLifecycle("c1", { action: "UNPUBLISH" }, "a1");

    expect(result.status).toBe("PAUSED");
    expect(p.collectionMembership.count).not.toHaveBeenCalled();
  });

  it("imports every active current product without duplicating existing memberships", async () => {
    p.merchandisingCollection.findFirst.mockResolvedValue(collection);
    p.product.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }, { id: "p3" }]);
    p.collectionMembership.findMany.mockResolvedValue([{ productId: "p1" }]);
    p.collectionMembership.aggregate.mockResolvedValue({ _max: { rank: 4 } });
    p.collectionMembership.createMany.mockResolvedValue({ count: 2 });
    p.merchandisingCollection.update.mockResolvedValue(collection);
    p.adminLog.create.mockResolvedValue({});

    const result = await importCurrentProducts("c1", { adminId: "a1" });

    expect(result).toMatchObject({ imported: 2, eligible: 3 });
    expect(p.collectionMembership.createMany.mock.calls[0][0].data).toEqual([
      expect.objectContaining({ productId: "p2", rank: 5 }),
      expect.objectContaining({ productId: "p3", rank: 6 }),
    ]);
  });

  it("reorders the homepage in one transaction", async () => {
    p.homepageSection.count.mockResolvedValue(2);
    p.homepageSection.findMany
      .mockResolvedValueOnce([{ id: "s1" }, { id: "s2" }])
      .mockResolvedValueOnce([
        { id: "s2", position: 0 },
        { id: "s1", position: 1 },
      ]);
    p.homepageSection.update.mockResolvedValue({});
    p.adminLog.create.mockResolvedValue({});

    const result = await reorderHomepageSections({ sectionIds: ["s2", "s1"] }, "a1");

    expect(p.homepageSection.update.mock.calls.map((call: any[]) => call[0])).toEqual([
      { where: { id: "s2" }, data: { position: 0 } },
      { where: { id: "s1" }, data: { position: 1 } },
    ]);
    expect(result[0].id).toBe("s2");
  });
});

describe("keyset cursors", () => {
  it("round-trips rank and product id without an OFFSET", () => {
    const cursor = encodeCursor({ rank: 42, productId: "p42", source: "membership" });
    expect(decodeCursor(cursor)).toEqual({ rank: 42, productId: "p42", source: "membership" });
  });

  it("rejects malformed cursors", () => {
    expect(() => decodeCursor("not-a-cursor")).toThrow("Invalid collection cursor");
  });
});

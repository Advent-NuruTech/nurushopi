import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma } from "@nuru/db";
import { decodeCursor, encodeCursor } from "../../src/modules/merchandising/cursor.js";
import { updateCollection } from "../../src/modules/merchandising/merchandising.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;
const collection = {
  id: "c1", key: "flash_sale", displayName: "Nuru Rush", shortName: null,
  description: null, collectionType: "flash_sale", selectionStrategy: "promotion",
  status: "ACTIVE", priority: 1, placement: null, startAt: null, endAt: null,
  maxProducts: 12, sortStrategy: "rank", eligibilityRules: null, configuration: null,
  imageUrl: null, icon: null, badgeText: null, ctaText: null, ctaUrl: null,
  isPersonalized: false, isSponsored: false, cacheVersion: 1, createdById: "a1",
  createdAt: new Date(), updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function" ? (arg as (tx: unknown) => unknown)(p) : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("collection identity", () => {
  it("renames presentation while preserving the immutable key and audit identity", async () => {
    p.merchandisingCollection.findUnique.mockResolvedValue(collection);
    p.merchandisingCollection.update.mockResolvedValue({ ...collection, displayName: "Weekend Rush", cacheVersion: 2 });
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

describe("keyset cursors", () => {
  it("round-trips rank and product id without an OFFSET", () => {
    const cursor = encodeCursor({ rank: 42, productId: "p42", source: "membership" });
    expect(decodeCursor(cursor)).toEqual({ rank: 42, productId: "p42", source: "membership" });
  });

  it("rejects malformed cursors", () => {
    expect(() => decodeCursor("not-a-cursor")).toThrow("Invalid collection cursor");
  });
});


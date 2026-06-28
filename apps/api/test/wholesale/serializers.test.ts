import { describe, it, expect } from "vitest";
import type { WholesaleItem } from "@nuru/db";
import { toWholesaleItemDTO } from "../../src/modules/wholesale/serializers.js";

const decimal = (s: string) => ({ toString: () => s }) as unknown as WholesaleItem["unitPrice"];

function makeItem(overrides: Partial<WholesaleItem> = {}): WholesaleItem {
  return {
    id: "w1",
    name: "Bulk Sugar",
    slug: "bulk-sugar",
    description: null,
    unitPrice: decimal("2500.00"),
    minQuantity: 10,
    images: ["https://img/1"],
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    ...overrides,
  } as WholesaleItem;
}

describe("toWholesaleItemDTO", () => {
  it("serialises the Decimal unitPrice to a string", () => {
    expect(toWholesaleItemDTO(makeItem()).unitPrice).toBe("2500.00");
  });

  it("passes through minQuantity and images", () => {
    const dto = toWholesaleItemDTO(makeItem({ minQuantity: 50 }));
    expect(dto.minQuantity).toBe(50);
    expect(dto.images).toEqual(["https://img/1"]);
  });

  it("emits ISO date strings", () => {
    const dto = toWholesaleItemDTO(makeItem());
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(dto.updatedAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("preserves a null slug/description", () => {
    const dto = toWholesaleItemDTO(makeItem({ slug: null, description: null }));
    expect(dto.slug).toBeNull();
    expect(dto.description).toBeNull();
  });
});

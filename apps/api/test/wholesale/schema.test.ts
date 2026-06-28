import { describe, it, expect } from "vitest";
import {
  wholesaleItemCreateSchema,
  wholesaleItemQuerySchema,
  wholesaleItemUpdateSchema,
} from "@nuru/types";

describe("wholesaleItemQuerySchema", () => {
  it("applies pagination + sort defaults", () => {
    const q = wholesaleItemQuerySchema.parse({});
    expect(q).toMatchObject({ page: 1, pageSize: 20, sort: "newest" });
  });

  it("coerces numeric + boolean query strings", () => {
    const q = wholesaleItemQuerySchema.parse({
      page: "2",
      pageSize: "30",
      isActive: "true",
      minPrice: "100",
      minQuantity: "12",
    });
    expect(q.page).toBe(2);
    expect(q.pageSize).toBe(30);
    expect(q.isActive).toBe(true);
    expect(q.minPrice).toBe(100);
    expect(q.minQuantity).toBe(12);
  });

  it("caps pageSize at 100", () => {
    expect(wholesaleItemQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });
});

describe("wholesaleItemCreateSchema", () => {
  it("requires a name and coerces unitPrice", () => {
    const w = wholesaleItemCreateSchema.parse({ name: "Sack of Rice", unitPrice: "1999.50" });
    expect(w.name).toBe("Sack of Rice");
    expect(w.unitPrice).toBe(1999.5);
    expect(w.minQuantity).toBe(1);
    expect(w.images).toEqual([]);
    expect(w.isActive).toBe(true);
  });

  it("defaults minQuantity to 1 and rejects 0", () => {
    expect(wholesaleItemCreateSchema.parse({ name: "x", unitPrice: 1 }).minQuantity).toBe(1);
    expect(
      wholesaleItemCreateSchema.safeParse({ name: "x", unitPrice: 1, minQuantity: 0 }).success,
    ).toBe(false);
  });

  it("rejects a fractional minQuantity", () => {
    expect(
      wholesaleItemCreateSchema.safeParse({ name: "x", unitPrice: 1, minQuantity: 2.5 }).success,
    ).toBe(false);
  });

  it("rejects a negative unitPrice", () => {
    expect(wholesaleItemCreateSchema.safeParse({ name: "x", unitPrice: -1 }).success).toBe(false);
  });

  it("rejects more than 3 images", () => {
    const res = wholesaleItemCreateSchema.safeParse({
      name: "x",
      unitPrice: 1,
      images: ["https://a/1", "https://a/2", "https://a/3", "https://a/4"],
    });
    expect(res.success).toBe(false);
  });

  it("rejects unknown keys (strict)", () => {
    expect(
      wholesaleItemCreateSchema.safeParse({ name: "x", unitPrice: 1, bogus: true }).success,
    ).toBe(false);
  });
});

describe("wholesaleItemUpdateSchema", () => {
  it("makes every field optional", () => {
    expect(wholesaleItemUpdateSchema.parse({}).name).toBeUndefined();
    expect(wholesaleItemUpdateSchema.parse({ unitPrice: "5" }).unitPrice).toBe(5);
  });
});

import { describe, it, expect } from "vitest";
import {
  categoryCreateSchema,
  heroCreateSchema,
  productCreateSchema,
  productQuerySchema,
  slugSchema,
} from "@nuru/types";

describe("slugSchema", () => {
  it("accepts a valid slug", () => {
    expect(slugSchema.parse("nice-product-1")).toBe("nice-product-1");
  });
  it("lowercases input", () => {
    expect(slugSchema.parse("Nice-Product")).toBe("nice-product");
  });
  it("rejects spaces and symbols", () => {
    expect(slugSchema.safeParse("bad slug!").success).toBe(false);
  });
});

describe("productQuerySchema", () => {
  it("applies pagination + sort defaults", () => {
    const q = productQuerySchema.parse({});
    expect(q).toMatchObject({ page: 1, pageSize: 20, sort: "newest" });
  });
  it("coerces numeric + boolean query strings", () => {
    const q = productQuerySchema.parse({
      page: "3",
      pageSize: "50",
      isFeatured: "true",
      minPrice: "10",
    });
    expect(q.page).toBe(3);
    expect(q.pageSize).toBe(50);
    expect(q.isFeatured).toBe(true);
    expect(q.minPrice).toBe(10);
  });
  it("caps pageSize at 100", () => {
    expect(productQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });
  it("rejects page below 1", () => {
    expect(productQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });
});

describe("productCreateSchema", () => {
  it("requires a name and coerces price", () => {
    const p = productCreateSchema.parse({ name: "Widget", price: "9.99" });
    expect(p.name).toBe("Widget");
    expect(p.price).toBe(9.99);
    expect(p.images).toEqual([]);
    expect(p.isActive).toBe(true);
  });
  it("rejects negative price", () => {
    expect(productCreateSchema.safeParse({ name: "x", price: -1 }).success).toBe(false);
  });
  it("rejects more than 3 images", () => {
    const res = productCreateSchema.safeParse({
      name: "x",
      price: 1,
      images: ["https://a/1", "https://a/2", "https://a/3", "https://a/4"],
    });
    expect(res.success).toBe(false);
  });
  it("rejects unknown keys (strict)", () => {
    expect(
      productCreateSchema.safeParse({ name: "x", price: 1, bogus: true }).success,
    ).toBe(false);
  });
});

describe("categoryCreateSchema", () => {
  it("defaults sortOrder to 0", () => {
    expect(categoryCreateSchema.parse({ name: "Books" }).sortOrder).toBe(0);
  });
});

describe("heroCreateSchema", () => {
  it("rejects when endsAt precedes startsAt", () => {
    const res = heroCreateSchema.safeParse({
      message: "Sale",
      startsAt: "2026-02-01T00:00:00Z",
      endsAt: "2026-01-01T00:00:00Z",
    });
    expect(res.success).toBe(false);
  });
});

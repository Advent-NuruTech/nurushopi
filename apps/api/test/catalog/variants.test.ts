import { describe, expect, it } from "vitest";
import { productCreateSchema, productUpdateSchema, wholesaleItemCreateSchema, wholesaleItemUpdateSchema } from "@nuru/types";

describe.each([
  ["retail", productCreateSchema, productUpdateSchema, { name: "Shirt", price: 500 }],
  ["wholesale", wholesaleItemCreateSchema, wholesaleItemUpdateSchema, { name: "Shirt", unitPrice: 300 }],
] as const)("%s variants", (_name, create, update, base) => {
  it("keeps variants optional for existing products", () => {
    expect(create.safeParse(base).success).toBe(true);
    expect(update.parse({})).not.toHaveProperty("variants");
    expect(update.parse({ variants: [] }).variants).toEqual([]);
  });
  it("preserves independent images, prices and omitted images", () => {
    const variants = [{ name: "Blue / M", imageUrl: "https://example.com/blue.jpg", price: 650 }, { name: "Red / L", imageUrl: null }];
    expect(create.parse({ ...base, variants }).variants).toEqual(variants);
  });
  it("rejects duplicate names, empty names, unsafe image URLs and negative prices", () => {
    for (const variants of [[{ name: "Blue" }, { name: " blue " }], [{ name: " " }], [{ name: "Blue", imageUrl: "javascript:alert(1)" }], [{ name: "Blue", imageUrl: "invalid" }], [{ name: "Blue", price: -1 }]]) {
      expect(create.safeParse({ ...base, variants }).success).toBe(false);
    }
  });
  it("limits the number of variants", () => {
    expect(create.safeParse({ ...base, variants: Array.from({ length: 51 }, (_, i) => ({ name: `Option ${i}` })) }).success).toBe(false);
  });
});

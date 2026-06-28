import { describe, it, expect } from "vitest";
import { toProductDTO, type ProductWithCategory } from "../../src/modules/catalog/serializers.js";

const decimal = (s: string) => ({ toString: () => s }) as unknown as ProductWithCategory["price"];

function makeProduct(overrides: Partial<ProductWithCategory> = {}): ProductWithCategory {
  return {
    id: "p1",
    name: "Widget",
    slug: "widget",
    description: null,
    shortDescription: null,
    price: decimal("10.00"),
    originalPrice: null,
    sellingPrice: null,
    images: ["https://img/1"],
    stock: 5,
    isActive: true,
    isFeatured: false,
    categoryId: "c1",
    createdById: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    category: { id: "c1", name: "Tools", slug: "tools" },
    ...overrides,
  } as ProductWithCategory;
}

describe("toProductDTO", () => {
  it("serialises Decimal prices to strings", () => {
    const dto = toProductDTO(makeProduct({ originalPrice: decimal("12.50") }));
    expect(dto.price).toBe("10.00");
    expect(dto.originalPrice).toBe("12.50");
    expect(dto.sellingPrice).toBeNull();
  });

  it("derives inStock from stock", () => {
    expect(toProductDTO(makeProduct({ stock: 0 })).inStock).toBe(false);
    expect(toProductDTO(makeProduct({ stock: 3 })).inStock).toBe(true);
  });

  it("emits ISO date strings", () => {
    const dto = toProductDTO(makeProduct());
    expect(dto.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("flattens the embedded category", () => {
    const dto = toProductDTO(makeProduct());
    expect(dto.category).toEqual({ id: "c1", name: "Tools", slug: "tools" });
  });

  it("returns null category when absent", () => {
    expect(toProductDTO(makeProduct({ category: null })).category).toBeNull();
  });
});

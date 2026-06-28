import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "../../src/modules/catalog/slug.js";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("strips symbols and collapses separators", () => {
    expect(slugify("  Cool!! Product__Name  ")).toBe("cool-product-name");
  });
  it("removes diacritics", () => {
    expect(slugify("Café Crème")).toBe("cafe-creme");
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug when free", async () => {
    const slug = await uniqueSlug("My Item", async () => false);
    expect(slug).toBe("my-item");
  });

  it("appends a counter on collision", async () => {
    const taken = new Set(["my-item", "my-item-2"]);
    const slug = await uniqueSlug("My Item", async (s) => taken.has(s));
    expect(slug).toBe("my-item-3");
  });

  it("falls back to 'item' for empty input", async () => {
    const slug = await uniqueSlug("!!!", async () => false);
    expect(slug).toBe("item");
  });
});

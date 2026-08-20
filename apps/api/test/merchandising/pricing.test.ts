import { describe, expect, it, vi } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { Prisma } from "@nuru/db";
import { calculatePromotionPrice, selectEffectivePrice } from "../../src/modules/merchandising/pricing.service.js";

function candidate(type: "FIXED_PRICE" | "PERCENTAGE" | "FIXED_AMOUNT", value: string, explicit?: string) {
  return {
    id: "pp1", promotionId: "promo1", productId: "p1",
    promotionalPrice: explicit ? new Prisma.Decimal(explicit) : null,
    inventoryLimit: null, purchasedCount: 0, perCustomerLimit: null, metadata: null,
    createdAt: new Date(),
    promotion: {
      id: "promo1", key: "rush", name: "Rush", status: "ACTIVE", discountType: type,
      discountValue: new Prisma.Decimal(value), fundingType: "PLATFORM", sellerFundingPct: null,
      collectionId: null, startsAt: new Date(), endsAt: new Date(Date.now() + 60_000),
      inventoryLimit: null, purchasedCount: 0, perCustomerLimit: null, configuration: null,
      createdById: null, createdAt: new Date(), updatedAt: new Date(),
    },
  } as never;
}

describe("promotion pricing", () => {
  it("calculates percentage and fixed discounts without mutating base price", () => {
    expect(calculatePromotionPrice(new Prisma.Decimal("100"), candidate("PERCENTAGE", "20")).toString()).toBe("80.00");
    expect(calculatePromotionPrice(new Prisma.Decimal("100"), candidate("FIXED_AMOUNT", "15")).toString()).toBe("85.00");
  });

  it("selects the cheapest valid promotion and ignores sold-out campaigns", () => {
    const soldOut = candidate("FIXED_PRICE", "10") as never as { promotion: { inventoryLimit: number | null; purchasedCount: number } };
    soldOut.promotion.inventoryLimit = 1;
    soldOut.promotion.purchasedCount = 1;
    const result = selectEffectivePrice(
      { price: new Prisma.Decimal("100"), sellingPrice: null },
      [soldOut as never, candidate("PERCENTAGE", "25")],
    );
    expect(result.effectivePrice.toString()).toBe("75.00");
    expect(result.promotionId).toBe("promo1");
  });

  it("begins and expires from server timestamps without a page being open", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");
    const scheduled = candidate("PERCENTAGE", "20") as never as { promotion: { startsAt: Date; endsAt: Date } };
    scheduled.promotion.startsAt = new Date("2026-08-20T13:00:00.000Z");
    scheduled.promotion.endsAt = new Date("2026-08-20T14:00:00.000Z");
    expect(selectEffectivePrice({ price: new Prisma.Decimal("100"), sellingPrice: null }, [scheduled as never], now).effectivePrice.toString()).toBe("100.00");
    expect(selectEffectivePrice({ price: new Prisma.Decimal("100"), sellingPrice: null }, [scheduled as never], new Date("2026-08-20T13:30:00.000Z")).effectivePrice.toString()).toBe("80.00");
    expect(selectEffectivePrice({ price: new Prisma.Decimal("100"), sellingPrice: null }, [scheduled as never], new Date("2026-08-20T14:00:00.000Z")).effectivePrice.toString()).toBe("100.00");
  });
});

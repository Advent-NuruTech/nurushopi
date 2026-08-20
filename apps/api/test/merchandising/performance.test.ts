import { describe, expect, it } from "vitest";
import { trendingScore } from "../../src/modules/merchandising/ranking.js";

describe("large candidate scoring", () => {
  it("scores and selects a 100k-product candidate set without quadratic work", () => {
    const started = performance.now();
    const candidates = Array.from({ length: 100_000 }, (_, index) => ({
      productId: `p${index.toString().padStart(6, "0")}`,
      score: trendingScore({
        ageHours: index % 72,
        views: index % 500,
        uniqueViewers: index % 300,
        cartAdds: index % 20,
        wishlistAdds: index % 15,
        purchases: index % 8,
        unitsSold: index % 12,
        reviewActivity: index % 4,
        suspiciousEvents: index % 11 === 0 ? 2 : 0,
      }),
    }));
    const top = candidates.sort((a, b) => b.score - a.score || a.productId.localeCompare(b.productId)).slice(0, 1000);
    expect(top).toHaveLength(1000);
    expect(top[0]!.score).toBeGreaterThanOrEqual(top.at(-1)!.score);
    expect(performance.now() - started).toBeLessThan(5_000);
  }, 10_000);
});


import { describe, expect, it } from "vitest";
import { bestsellerScore, timeDecay, trendingScore } from "../../src/modules/merchandising/ranking.js";
import { stableBucket } from "../../src/modules/merchandising/experiments.service.js";

describe("merchandising ranking", () => {
  it("decays old trending activity", () => {
    expect(timeDecay(12, 12)).toBeCloseTo(0.5);
    expect(trendingScore({
      ageHours: 24, views: 50, uniqueViewers: 40, cartAdds: 5, wishlistAdds: 3,
      purchases: 2, unitsSold: 2, reviewActivity: 1, suspiciousEvents: 0,
    })).toBeLessThan(trendingScore({
      ageHours: 1, views: 50, uniqueViewers: 40, cartAdds: 5, wishlistAdds: 3,
      purchases: 2, unitsSold: 2, reviewActivity: 1, suspiciousEvents: 0,
    }));
  });

  it("does not let bot-like repeated views dominate unique engagement", () => {
    const bot = trendingScore({
      ageHours: 1, views: 10_000, uniqueViewers: 1, cartAdds: 0, wishlistAdds: 0,
      purchases: 0, unitsSold: 0, reviewActivity: 0, suspiciousEvents: 100,
    });
    const genuine = trendingScore({
      ageHours: 1, views: 100, uniqueViewers: 90, cartAdds: 10, wishlistAdds: 10,
      purchases: 5, unitsSold: 5, reviewActivity: 2, suspiciousEvents: 0,
    });
    expect(bot).toBeLessThan(genuine);
  });

  it("penalizes cancellation and return-heavy bestsellers", () => {
    const healthy = bestsellerScore({ unitsSold: 100, revenue: 10_000, impressions: 2_000, purchases: 90, cancellations: 1, returns: 2 });
    const unhealthy = bestsellerScore({ unitsSold: 100, revenue: 10_000, impressions: 2_000, purchases: 90, cancellations: 30, returns: 20 });
    expect(unhealthy).toBeLessThan(healthy);
  });

  it("assigns an experiment actor to a stable bucket", () => {
    expect(stableBucket("homepage_order", "user-123")).toBe(stableBucket("homepage_order", "user-123"));
    expect(stableBucket("homepage_order", "user-123")).toBeGreaterThanOrEqual(0);
    expect(stableBucket("homepage_order", "user-123")).toBeLessThan(10_000);
  });
});


import { prisma, Prisma, type ProductMetricHourly } from "@nuru/db";
import { COLLECTION_KEYS } from "@nuru/types";
import { bestsellerScore, trendingScore } from "./ranking.js";
import { dispatchRetentionBatch } from "./retention.service.js";
import {
  dispatchMonthlyPromotionEmails,
  scheduleMonthlyPromotionEmails,
} from "./monthly-email.service.js";

export interface MaintenanceResult {
  activatedPromotions: number;
  expiredPromotions: number;
  expiredMemberships: number;
  freshFinds: number;
  bestsellerCandidates: number;
  trendingCandidates: number;
  retentionSent: number;
  monthlyEmailsScheduled: number;
  monthlyEmailsSent: number;
  completedAt: string;
}

function configNumber(value: Prisma.JsonValue | null, key: string, fallback: number): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : fallback;
}

async function aggregateCompletedHours(now: Date): Promise<void> {
  const end = new Date(now);
  end.setUTCMinutes(0, 0, 0);
  const start = new Date(end.getTime() - 2 * 60 * 60 * 1000);

  // Set-based and bounded: reprocessing two complete hours makes late events
  // converge without loading high-volume raw event rows into Node.
  await prisma.$executeRaw`
    INSERT INTO "product_metrics_hourly" (
      "id", "productId", "bucketStart", "impressions", "uniqueViewers", "views",
      "wishlistAdds", "cartAdds", "purchases", "unitsSold", "revenue",
      "cancellations", "returns", "reviewActivity", "suspiciousEvents", "updatedAt"
    )
    SELECT
      md5("productId" || date_trunc('hour', "occurredAt")::text),
      "productId", date_trunc('hour', "occurredAt"),
      count(*) FILTER (WHERE "eventType" IN ('product_impression', 'search_result_impression'))::int,
      count(DISTINCT COALESCE("userId", "anonymousId", "sessionId", "ipHash"))
        FILTER (WHERE "eventType" = 'product_view' AND "trusted" = true)::int,
      count(*) FILTER (WHERE "eventType" = 'product_view' AND "trusted" = true)::int,
      count(*) FILTER (WHERE "eventType" = 'wishlist_add' AND "trusted" = true)::int,
      count(*) FILTER (WHERE "eventType" = 'add_to_cart' AND "trusted" = true)::int,
      count(*) FILTER (WHERE "eventType" = 'purchase_completed' AND "trusted" = true)::int,
      sum(CASE WHEN "eventType"='purchase_completed' AND "trusted"=true
        THEN COALESCE(("metadata"->>'quantity')::int, 1) ELSE 0 END)::int,
      sum(CASE WHEN "eventType"='purchase_completed' AND "trusted"=true
        THEN COALESCE(("metadata"->>'revenue')::numeric, 0) ELSE 0 END),
      count(*) FILTER (WHERE "eventType" = 'order_cancelled' AND "trusted"=true)::int,
      count(*) FILTER (WHERE "eventType" = 'product_returned')::int,
      0,
      count(*) FILTER (WHERE "trusted" = false)::int,
      CURRENT_TIMESTAMP
    FROM "commerce_events"
    WHERE "productId" IS NOT NULL AND "occurredAt" >= ${start} AND "occurredAt" < ${end}
    GROUP BY "productId", date_trunc('hour', "occurredAt")
    ON CONFLICT ("productId", "bucketStart") DO UPDATE SET
      "impressions" = EXCLUDED."impressions", "uniqueViewers" = EXCLUDED."uniqueViewers",
      "views" = EXCLUDED."views", "wishlistAdds" = EXCLUDED."wishlistAdds",
      "cartAdds" = EXCLUDED."cartAdds", "purchases" = EXCLUDED."purchases",
      "unitsSold" = EXCLUDED."unitsSold", "revenue" = EXCLUDED."revenue",
      "cancellations" = EXCLUDED."cancellations",
      "returns" = EXCLUDED."returns", "suspiciousEvents" = EXCLUDED."suspiciousEvents",
      "updatedAt" = CURRENT_TIMESTAMP
  `;

  const dayStart = new Date(end.getTime() - 2 * 86_400_000);
  await prisma.$executeRaw`
    INSERT INTO "product_metrics_daily" (
      "id", "productId", "bucketDate", "impressions", "uniqueViewers", "views",
      "wishlistAdds", "cartAdds", "purchases", "unitsSold", "revenue",
      "cancellations", "returns", "reviewActivity", "updatedAt"
    )
    SELECT md5("productId" || "bucketStart"::date::text), "productId", "bucketStart"::date,
      sum("impressions")::int, sum("uniqueViewers")::int, sum("views")::int,
      sum("wishlistAdds")::int, sum("cartAdds")::int, sum("purchases")::int,
      sum("unitsSold")::int, sum("revenue"), sum("cancellations")::int,
      sum("returns")::int, sum("reviewActivity")::int, CURRENT_TIMESTAMP
    FROM "product_metrics_hourly" WHERE "bucketStart" >= ${dayStart}
    GROUP BY "productId", "bucketStart"::date
    ON CONFLICT ("productId", "bucketDate") DO UPDATE SET
      "impressions"=EXCLUDED."impressions", "uniqueViewers"=EXCLUDED."uniqueViewers",
      "views"=EXCLUDED."views", "wishlistAdds"=EXCLUDED."wishlistAdds",
      "cartAdds"=EXCLUDED."cartAdds", "purchases"=EXCLUDED."purchases",
      "unitsSold"=EXCLUDED."unitsSold", "revenue"=EXCLUDED."revenue",
      "cancellations"=EXCLUDED."cancellations", "returns"=EXCLUDED."returns",
      "reviewActivity"=EXCLUDED."reviewActivity", "updatedAt"=CURRENT_TIMESTAMP
  `;

  await prisma.$executeRaw`
    INSERT INTO "collection_metrics_daily" (
      "id", "collectionId", "bucketDate", "impressions", "uniqueViewers", "clicks",
      "productViews", "cartAdds", "purchases", "orders", "revenue", "updatedAt"
    )
    SELECT md5("collectionId" || "occurredAt"::date::text), "collectionId", "occurredAt"::date,
      count(*) FILTER (WHERE "eventType"='collection_impression')::int,
      count(DISTINCT COALESCE("userId", "anonymousId", "sessionId", "ipHash"))
        FILTER (WHERE "eventType"='collection_impression' AND "trusted"=true)::int,
      count(*) FILTER (WHERE "eventType"='collection_click' AND "trusted"=true)::int,
      count(*) FILTER (WHERE "eventType"='product_view' AND "trusted"=true)::int,
      count(*) FILTER (WHERE "eventType"='add_to_cart' AND "trusted"=true)::int,
      count(*) FILTER (WHERE "eventType"='purchase_completed' AND "trusted"=true)::int,
      count(*) FILTER (WHERE "eventType"='purchase_completed' AND "trusted"=true)::int,
      0, CURRENT_TIMESTAMP
    FROM "commerce_events"
    WHERE "collectionId" IS NOT NULL AND "occurredAt" >= ${dayStart}
    GROUP BY "collectionId", "occurredAt"::date
    ON CONFLICT ("collectionId", "bucketDate") DO UPDATE SET
      "impressions"=EXCLUDED."impressions", "uniqueViewers"=EXCLUDED."uniqueViewers",
      "clicks"=EXCLUDED."clicks", "productViews"=EXCLUDED."productViews",
      "cartAdds"=EXCLUDED."cartAdds", "purchases"=EXCLUDED."purchases",
      "orders"=EXCLUDED."orders", "revenue"=EXCLUDED."revenue", "updatedAt"=CURRENT_TIMESTAMP
  `;
}

async function publishRanking(
  collectionId: string,
  algorithm: string,
  scores: Array<{ productId: string; score: number; reasons: Prisma.InputJsonValue }>,
  now: Date,
): Promise<number> {
  const ranked = scores
    .filter((s) => Number.isFinite(s.score) && s.score > 0)
    .sort((a, b) => b.score - a.score || a.productId.localeCompare(b.productId))
    .slice(0, 10_000);
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    if (ranked.length) {
      await tx.productRanking.createMany({
        data: ranked.map((item, index) => ({
          collectionId,
          productId: item.productId,
          algorithm,
          segmentKey: "global",
          snapshotAt: now,
          score: item.score,
          rank: index + 1,
          reasons: item.reasons,
          expiresAt,
        })),
      });
    }
    await tx.merchandisingCollection.update({
      where: { id: collectionId },
      data: { cacheVersion: { increment: 1 } },
    });
    await tx.productRanking.deleteMany({
      where: { collectionId, snapshotAt: { lt: new Date(now.getTime() - 48 * 60 * 60 * 1000) } },
    });
  });
  return ranked.length;
}

async function refreshFreshFinds(now: Date): Promise<number> {
  const collection = await prisma.merchandisingCollection.findUnique({
    where: { key: COLLECTION_KEYS.newArrivals },
  });
  if (!collection) return 0;
  const windowDays = configNumber(collection.configuration, "newArrivalWindowDays", 30);
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      stock: { gt: 0 },
      createdAt: { gte: new Date(now.getTime() - windowDays * 86_400_000) },
    },
    orderBy: { createdAt: "desc" },
    take: 10_000,
    select: { id: true, createdAt: true, stock: true },
  });
  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < products.length; index += 500) {
      const batch = products.slice(index, index + 500);
      await Promise.all(
        batch.map((product, offset) =>
          tx.collectionMembership.upsert({
            where: {
              collectionId_productId: { collectionId: collection.id, productId: product.id },
            },
            create: {
              collectionId: collection.id,
              productId: product.id,
              source: "AUTOMATIC",
              rank: index + offset + 1,
              score: product.createdAt.getTime() / 1_000_000_000_000 + Math.log1p(product.stock),
              expiresAt: new Date(product.createdAt.getTime() + windowDays * 86_400_000),
              metadata: { windowDays },
            },
            update: {
              rank: index + offset + 1,
              expiresAt: new Date(product.createdAt.getTime() + windowDays * 86_400_000),
            },
          }),
        ),
      );
    }
    await tx.collectionMembership.deleteMany({
      where: { collectionId: collection.id, source: "AUTOMATIC", expiresAt: { lte: now } },
    });
    await tx.merchandisingCollection.update({
      where: { id: collection.id },
      data: { cacheVersion: { increment: 1 } },
    });
  });
  return products.length;
}

interface MetricTotals {
  impressions: number;
  uniqueViewers: number;
  views: number;
  wishlistAdds: number;
  cartAdds: number;
  purchases: number;
  unitsSold: number;
  revenue: number;
  cancellations: number;
  returns: number;
  reviewActivity: number;
  suspiciousEvents: number;
  latestAgeHours: number;
}

function sumMetrics(rows: ProductMetricHourly[], now: Date) {
  const byProduct = new Map<string, MetricTotals>();
  for (const row of rows) {
    const value = byProduct.get(row.productId) ?? {
      impressions: 0,
      uniqueViewers: 0,
      views: 0,
      wishlistAdds: 0,
      cartAdds: 0,
      purchases: 0,
      unitsSold: 0,
      revenue: 0,
      cancellations: 0,
      returns: 0,
      reviewActivity: 0,
      suspiciousEvents: 0,
      latestAgeHours: Number.POSITIVE_INFINITY,
    };
    value.impressions += row.impressions;
    value.uniqueViewers += row.uniqueViewers;
    value.views += row.views;
    value.wishlistAdds += row.wishlistAdds;
    value.cartAdds += row.cartAdds;
    value.purchases += row.purchases;
    value.unitsSold += row.unitsSold;
    value.revenue += Number(row.revenue);
    value.cancellations += row.cancellations;
    value.returns += row.returns;
    value.reviewActivity += row.reviewActivity;
    value.suspiciousEvents += row.suspiciousEvents;
    value.latestAgeHours = Math.min(
      value.latestAgeHours,
      (now.getTime() - row.bucketStart.getTime()) / 3_600_000,
    );
    byProduct.set(row.productId, value);
  }
  return byProduct;
}

export async function runMerchandisingMaintenance(now = new Date()): Promise<MaintenanceResult> {
  const [activated, expired, memberships] = await prisma.$transaction([
    prisma.promotion.updateMany({
      where: { status: "SCHEDULED", startsAt: { lte: now }, endsAt: { gt: now } },
      data: { status: "ACTIVE" },
    }),
    prisma.promotion.updateMany({
      where: { status: { in: ["ACTIVE", "SCHEDULED"] }, endsAt: { lte: now } },
      data: { status: "ARCHIVED" },
    }),
    prisma.collectionMembership.deleteMany({ where: { expiresAt: { lte: now } } }),
  ]);
  await aggregateCompletedHours(now);
  const freshFinds = await refreshFreshFinds(now);
  const metrics = await prisma.productMetricHourly.findMany({
    where: {
      bucketStart: { gte: new Date(now.getTime() - 90 * 86_400_000) },
      product: { isActive: true, stock: { gt: 0 } },
    },
  });
  const [best, trending] = await Promise.all([
    prisma.merchandisingCollection.findUnique({ where: { key: COLLECTION_KEYS.bestSellers } }),
    prisma.merchandisingCollection.findUnique({ where: { key: COLLECTION_KEYS.trending } }),
  ]);
  const bestsellerWindowDays = best
    ? configNumber(best.configuration, "rankingWindowDays", 30)
    : 30;
  const bestsellerTotals = sumMetrics(
    metrics.filter(
      (metric) => metric.bucketStart >= new Date(now.getTime() - bestsellerWindowDays * 86_400_000),
    ),
    now,
  );
  const trendingTotals = new Map<
    string,
    { score: number; uniqueViewers: number; suspiciousEvents: number }
  >();
  for (const metric of metrics) {
    const ageHours = (now.getTime() - metric.bucketStart.getTime()) / 3_600_000;
    // A 12-hour half-life makes rows older than a few days negligible while
    // preserving a bounded lookback for recovery/reprocessing.
    if (ageHours > 7 * 24) continue;
    const value = trendingTotals.get(metric.productId) ?? {
      score: 0,
      uniqueViewers: 0,
      suspiciousEvents: 0,
    };
    value.score += trendingScore({
      ageHours,
      views: metric.views,
      uniqueViewers: metric.uniqueViewers,
      cartAdds: metric.cartAdds,
      wishlistAdds: metric.wishlistAdds,
      purchases: metric.purchases,
      unitsSold: metric.unitsSold,
      reviewActivity: metric.reviewActivity,
      suspiciousEvents: metric.suspiciousEvents,
    });
    value.uniqueViewers += metric.uniqueViewers;
    value.suspiciousEvents += metric.suspiciousEvents;
    trendingTotals.set(metric.productId, value);
  }
  const bestsellerCandidates = best
    ? await publishRanking(
        best.id,
        `bestseller_v1_${bestsellerWindowDays}d`,
        [...bestsellerTotals].map(([productId, s]) => ({
          productId,
          score: bestsellerScore(s),
          reasons: {
            windowDays: bestsellerWindowDays,
            unitsSold: s.unitsSold,
            conversion: s.impressions ? s.purchases / s.impressions : 0,
          },
        })),
        now,
      )
    : 0;
  const trendingCandidates = trending
    ? await publishRanking(
        trending.id,
        "trending_velocity_v1",
        [...trendingTotals].map(([productId, s]) => ({
          productId,
          score: s.score,
          reasons: {
            halfLifeHours: 12,
            uniqueViewers: s.uniqueViewers,
            suspiciousEvents: s.suspiciousEvents,
          },
        })),
        now,
      )
    : 0;
  const monthlyEmailsScheduled = await scheduleMonthlyPromotionEmails(now);
  const [retentionSent, monthlyEmailsSent] = await Promise.all([
    dispatchRetentionBatch(now),
    dispatchMonthlyPromotionEmails(now),
  ]);
  return {
    activatedPromotions: activated.count,
    expiredPromotions: expired.count,
    expiredMemberships: memberships.count,
    freshFinds,
    bestsellerCandidates,
    trendingCandidates,
    retentionSent,
    monthlyEmailsScheduled,
    monthlyEmailsSent,
    completedAt: new Date().toISOString(),
  };
}

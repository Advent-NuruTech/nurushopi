-- Additive foundation for merchandising, promotions, rankings, events,
-- retention and experimentation. Existing catalog/order tables remain the
-- source of truth; no product or order data is rewritten.
CREATE TYPE "MerchandisingStatus" AS ENUM ('DRAFT','SCHEDULED','ACTIVE','PAUSED','ARCHIVED');
CREATE TYPE "MembershipSource" AS ENUM ('AUTOMATIC','MANUAL','ALGORITHM','PROMOTION','RECOMMENDATION','SPONSORED');
CREATE TYPE "CollectionOverrideType" AS ENUM ('PIN','EXCLUDE','BOOST','LOWER');
CREATE TYPE "PromotionDiscountType" AS ENUM ('FIXED_PRICE','PERCENTAGE','FIXED_AMOUNT');
CREATE TYPE "PromotionFundingType" AS ENUM ('SELLER','PLATFORM','SHARED');
CREATE TYPE "BundleDiscountType" AS ENUM ('FIXED_PRICE','PERCENTAGE','FIXED_AMOUNT');
CREATE TYPE "RetentionTriggerStatus" AS ENUM ('PENDING','CLAIMED','SENT','SKIPPED','FAILED');
CREATE TYPE "ExperimentStatus" AS ENUM ('DRAFT','RUNNING','PAUSED','COMPLETED');

CREATE TABLE "merchandising_collections" (
  "id" TEXT PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "displayName" TEXT NOT NULL,
  "shortName" TEXT, "description" TEXT, "collectionType" TEXT NOT NULL DEFAULT 'generic',
  "selectionStrategy" TEXT NOT NULL DEFAULT 'hybrid', "status" "MerchandisingStatus" NOT NULL DEFAULT 'DRAFT',
  "priority" INTEGER NOT NULL DEFAULT 0, "placement" TEXT, "startAt" TIMESTAMP(3), "endAt" TIMESTAMP(3),
  "maxProducts" INTEGER NOT NULL DEFAULT 24, "sortStrategy" TEXT NOT NULL DEFAULT 'rank',
  "eligibilityRules" JSONB, "configuration" JSONB, "imageUrl" TEXT, "icon" TEXT,
  "badgeText" TEXT, "ctaText" TEXT, "ctaUrl" TEXT, "isPersonalized" BOOLEAN NOT NULL DEFAULT false,
  "isSponsored" BOOLEAN NOT NULL DEFAULT false, "cacheVersion" INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT REFERENCES "admins"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "merchandising_collections_status_startAt_endAt_idx" ON "merchandising_collections"("status","startAt","endAt");
CREATE INDEX "merchandising_collections_priority_id_idx" ON "merchandising_collections"("priority","id");

CREATE TABLE "collection_memberships" (
  "id" TEXT PRIMARY KEY, "collectionId" TEXT NOT NULL REFERENCES "merchandising_collections"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "source" "MembershipSource" NOT NULL DEFAULT 'AUTOMATIC', "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "rank" INTEGER, "startsAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3), "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE("collectionId","productId")
);
CREATE INDEX "collection_memberships_collectionId_rank_productId_idx" ON "collection_memberships"("collectionId","rank","productId");
CREATE INDEX "collection_memberships_collectionId_score_productId_idx" ON "collection_memberships"("collectionId","score","productId");
CREATE INDEX "collection_memberships_productId_idx" ON "collection_memberships"("productId");
CREATE INDEX "collection_memberships_expiresAt_idx" ON "collection_memberships"("expiresAt");

CREATE TABLE "collection_overrides" (
  "id" TEXT PRIMARY KEY, "collectionId" TEXT NOT NULL REFERENCES "merchandising_collections"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "type" "CollectionOverrideType" NOT NULL,
  "value" DOUBLE PRECISION NOT NULL DEFAULT 0, "reason" TEXT, "startsAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
  "createdById" TEXT REFERENCES "admins"("id") ON DELETE SET NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "collection_overrides_collectionId_type_startsAt_expiresAt_idx" ON "collection_overrides"("collectionId","type","startsAt","expiresAt");
CREATE INDEX "collection_overrides_productId_idx" ON "collection_overrides"("productId");

CREATE TABLE "homepage_sections" (
  "id" TEXT PRIMARY KEY, "collectionId" TEXT NOT NULL REFERENCES "merchandising_collections"("id") ON DELETE CASCADE,
  "position" INTEGER NOT NULL, "status" "MerchandisingStatus" NOT NULL DEFAULT 'DRAFT', "audience" JSONB,
  "device" TEXT NOT NULL DEFAULT 'all', "startAt" TIMESTAMP(3), "endAt" TIMESTAMP(3), "configuration" JSONB,
  "experimentKey" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "homepage_sections_status_device_position_idx" ON "homepage_sections"("status","device","position");
CREATE INDEX "homepage_sections_startAt_endAt_idx" ON "homepage_sections"("startAt","endAt");

CREATE TABLE "promotions" (
  "id" TEXT PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
  "status" "MerchandisingStatus" NOT NULL DEFAULT 'DRAFT', "discountType" "PromotionDiscountType" NOT NULL,
  "discountValue" DECIMAL(12,2) NOT NULL, "fundingType" "PromotionFundingType" NOT NULL DEFAULT 'PLATFORM',
  "sellerFundingPct" DECIMAL(5,2), "collectionId" TEXT REFERENCES "merchandising_collections"("id") ON DELETE SET NULL,
  "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "inventoryLimit" INTEGER,
  "purchasedCount" INTEGER NOT NULL DEFAULT 0, "perCustomerLimit" INTEGER, "configuration" JSONB,
  "createdById" TEXT REFERENCES "admins"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "promotions_status_startsAt_endsAt_idx" ON "promotions"("status","startsAt","endsAt");
CREATE INDEX "promotions_collectionId_idx" ON "promotions"("collectionId");

CREATE TABLE "promotion_products" (
  "id" TEXT PRIMARY KEY, "promotionId" TEXT NOT NULL REFERENCES "promotions"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "promotionalPrice" DECIMAL(12,2),
  "inventoryLimit" INTEGER, "purchasedCount" INTEGER NOT NULL DEFAULT 0, "perCustomerLimit" INTEGER,
  "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("promotionId","productId")
);
CREATE INDEX "promotion_products_productId_promotionId_idx" ON "promotion_products"("productId","promotionId");

CREATE TABLE "promotion_redemptions" (
  "id" TEXT PRIMARY KEY, "promotionId" TEXT NOT NULL REFERENCES "promotions"("id") ON DELETE RESTRICT,
  "promotionProductId" TEXT NOT NULL REFERENCES "promotion_products"("id") ON DELETE RESTRICT,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT,
  "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE RESTRICT,
  "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL, "anonymousId" TEXT,
  "quantity" INTEGER NOT NULL, "unitDiscount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "promotion_redemptions_promotionId_userId_idx" ON "promotion_redemptions"("promotionId","userId");
CREATE INDEX "promotion_redemptions_promotionId_anonymousId_idx" ON "promotion_redemptions"("promotionId","anonymousId");
CREATE INDEX "promotion_redemptions_orderId_idx" ON "promotion_redemptions"("orderId");

CREATE TABLE "bundles" (
  "id" TEXT PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "displayName" TEXT NOT NULL, "description" TEXT,
  "status" "MerchandisingStatus" NOT NULL DEFAULT 'DRAFT', "discountType" "BundleDiscountType" NOT NULL,
  "discountValue" DECIMAL(12,2) NOT NULL, "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3),
  "maxPurchases" INTEGER, "purchasedCount" INTEGER NOT NULL DEFAULT 0, "allowCrossSeller" BOOLEAN NOT NULL DEFAULT false,
  "configuration" JSONB, "createdById" TEXT REFERENCES "admins"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "bundles_status_startsAt_endsAt_idx" ON "bundles"("status","startsAt","endsAt");
CREATE TABLE "bundle_items" (
  "id" TEXT PRIMARY KEY, "bundleId" TEXT NOT NULL REFERENCES "bundles"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE RESTRICT, "quantity" INTEGER NOT NULL DEFAULT 1,
  "required" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0, "metadata" JSONB,
  UNIQUE("bundleId","productId")
);
CREATE INDEX "bundle_items_productId_idx" ON "bundle_items"("productId");

CREATE TABLE "spotlight_placements" (
  "id" TEXT PRIMARY KEY, "targetType" TEXT NOT NULL, "targetId" TEXT NOT NULL, "placement" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0, "audience" JSONB, "region" TEXT, "reason" TEXT, "creative" JSONB,
  "ctaText" TEXT, "ctaUrl" TEXT, "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT REFERENCES "admins"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "spotlight_placements_placement_startsAt_endsAt_priority_idx" ON "spotlight_placements"("placement","startsAt","endsAt","priority");
CREATE INDEX "spotlight_placements_targetType_targetId_idx" ON "spotlight_placements"("targetType","targetId");

CREATE TABLE "commerce_events" (
  "id" TEXT PRIMARY KEY, "eventId" TEXT NOT NULL UNIQUE, "eventType" TEXT NOT NULL,
  "userId" TEXT REFERENCES "users"("id") ON DELETE SET NULL, "anonymousId" TEXT, "sessionId" TEXT,
  "productId" TEXT REFERENCES "products"("id") ON DELETE SET NULL, "sellerId" TEXT,
  "collectionId" TEXT REFERENCES "merchandising_collections"("id") ON DELETE SET NULL,
  "searchQueryId" TEXT, "recommendationId" TEXT, "experimentKey" TEXT, "variantKey" TEXT,
  "position" INTEGER, "source" TEXT, "device" TEXT, "ipHash" TEXT, "userAgentHash" TEXT,
  "trusted" BOOLEAN NOT NULL DEFAULT true, "abuseScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "occurredAt" TIMESTAMP(3) NOT NULL, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "metadata" JSONB
);
CREATE INDEX "commerce_events_eventType_occurredAt_idx" ON "commerce_events"("eventType","occurredAt");
CREATE INDEX "commerce_events_productId_eventType_occurredAt_idx" ON "commerce_events"("productId","eventType","occurredAt");
CREATE INDEX "commerce_events_collectionId_eventType_occurredAt_idx" ON "commerce_events"("collectionId","eventType","occurredAt");
CREATE INDEX "commerce_events_userId_occurredAt_idx" ON "commerce_events"("userId","occurredAt");
CREATE INDEX "commerce_events_sessionId_occurredAt_idx" ON "commerce_events"("sessionId","occurredAt");

CREATE TABLE "product_metrics_hourly" (
  "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "bucketStart" TIMESTAMP(3) NOT NULL, "impressions" INTEGER NOT NULL DEFAULT 0,
  "uniqueViewers" INTEGER NOT NULL DEFAULT 0, "views" INTEGER NOT NULL DEFAULT 0,
  "wishlistAdds" INTEGER NOT NULL DEFAULT 0, "cartAdds" INTEGER NOT NULL DEFAULT 0,
  "purchases" INTEGER NOT NULL DEFAULT 0, "unitsSold" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0, "cancellations" INTEGER NOT NULL DEFAULT 0,
  "returns" INTEGER NOT NULL DEFAULT 0, "reviewActivity" INTEGER NOT NULL DEFAULT 0,
  "suspiciousEvents" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE("productId","bucketStart")
);
CREATE INDEX "product_metrics_hourly_bucketStart_productId_idx" ON "product_metrics_hourly"("bucketStart","productId");

CREATE TABLE "product_metrics_daily" (
  "id" TEXT PRIMARY KEY, "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "bucketDate" DATE NOT NULL, "impressions" INTEGER NOT NULL DEFAULT 0, "uniqueViewers" INTEGER NOT NULL DEFAULT 0,
  "views" INTEGER NOT NULL DEFAULT 0, "wishlistAdds" INTEGER NOT NULL DEFAULT 0, "cartAdds" INTEGER NOT NULL DEFAULT 0,
  "purchases" INTEGER NOT NULL DEFAULT 0, "unitsSold" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0, "cancellations" INTEGER NOT NULL DEFAULT 0,
  "returns" INTEGER NOT NULL DEFAULT 0, "reviewActivity" INTEGER NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE("productId","bucketDate")
);
CREATE INDEX "product_metrics_daily_bucketDate_productId_idx" ON "product_metrics_daily"("bucketDate","productId");

CREATE TABLE "collection_metrics_daily" (
  "id" TEXT PRIMARY KEY, "collectionId" TEXT NOT NULL REFERENCES "merchandising_collections"("id") ON DELETE CASCADE,
  "bucketDate" DATE NOT NULL, "impressions" INTEGER NOT NULL DEFAULT 0, "uniqueViewers" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0, "productViews" INTEGER NOT NULL DEFAULT 0, "cartAdds" INTEGER NOT NULL DEFAULT 0,
  "purchases" INTEGER NOT NULL DEFAULT 0, "orders" INTEGER NOT NULL DEFAULT 0,
  "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE("collectionId","bucketDate")
);
CREATE INDEX "collection_metrics_daily_bucketDate_collectionId_idx" ON "collection_metrics_daily"("bucketDate","collectionId");

CREATE TABLE "product_rankings" (
  "id" TEXT PRIMARY KEY, "collectionId" TEXT NOT NULL REFERENCES "merchandising_collections"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "algorithm" TEXT NOT NULL,
  "segmentKey" TEXT NOT NULL DEFAULT 'global', "snapshotAt" TIMESTAMP(3) NOT NULL,
  "score" DOUBLE PRECISION NOT NULL, "rank" INTEGER NOT NULL, "reasons" JSONB,
  "expiresAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("collectionId","algorithm","segmentKey","snapshotAt","productId")
);
CREATE INDEX "product_rankings_collectionId_segmentKey_snapshotAt_rank_productId_idx" ON "product_rankings"("collectionId","segmentKey","snapshotAt","rank","productId");
CREATE INDEX "product_rankings_expiresAt_idx" ON "product_rankings"("expiresAt");

CREATE TABLE "user_product_affinities" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "score" DOUBLE PRECISION NOT NULL,
  "reasons" JSONB, "computedAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3), UNIQUE("userId","productId")
);
CREATE INDEX "user_product_affinities_userId_score_productId_idx" ON "user_product_affinities"("userId","score","productId");

CREATE TABLE "notification_preferences" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "channel" TEXT NOT NULL, "topic" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT false,
  "consentedAt" TIMESTAMP(3), "quietHours" JSONB, "maxPerDay" INTEGER NOT NULL DEFAULT 2,
  "maxPerWeek" INTEGER NOT NULL DEFAULT 5, "updatedAt" TIMESTAMP(3) NOT NULL, UNIQUE("userId","channel","topic")
);
CREATE INDEX "notification_preferences_userId_enabled_idx" ON "notification_preferences"("userId","enabled");

CREATE TABLE "retention_subscriptions" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "subscriptionType" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "lastNotifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE("userId","productId","subscriptionType")
);
CREATE INDEX "retention_subscriptions_productId_subscriptionType_active_idx" ON "retention_subscriptions"("productId","subscriptionType","active");

CREATE TABLE "retention_triggers" (
  "id" TEXT PRIMARY KEY, "deduplicationKey" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "productId" TEXT REFERENCES "products"("id") ON DELETE SET NULL, "triggerType" TEXT NOT NULL, "channel" TEXT NOT NULL,
  "status" "RetentionTriggerStatus" NOT NULL DEFAULT 'PENDING', "priority" INTEGER NOT NULL DEFAULT 0,
  "scheduledAt" TIMESTAMP(3) NOT NULL, "claimedAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0, "payload" JSONB, "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "retention_triggers_status_scheduledAt_priority_idx" ON "retention_triggers"("status","scheduledAt","priority");
CREATE INDEX "retention_triggers_userId_triggerType_createdAt_idx" ON "retention_triggers"("userId","triggerType","createdAt");

CREATE TABLE "experiments" (
  "id" TEXT PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL,
  "status" "ExperimentStatus" NOT NULL DEFAULT 'DRAFT', "variants" JSONB NOT NULL,
  "allocation" INTEGER NOT NULL DEFAULT 10000, "primaryMetric" TEXT NOT NULL, "guardrailMetrics" JSONB,
  "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "experiments_status_startsAt_endsAt_idx" ON "experiments"("status","startsAt","endsAt");
CREATE TABLE "experiment_assignments" (
  "id" TEXT PRIMARY KEY, "experimentId" TEXT NOT NULL REFERENCES "experiments"("id") ON DELETE CASCADE,
  "userId" TEXT REFERENCES "users"("id") ON DELETE CASCADE, "anonymousId" TEXT,
  "variantKey" TEXT NOT NULL, "bucket" INTEGER NOT NULL, "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("experimentId","userId"), UNIQUE("experimentId","anonymousId")
);
CREATE INDEX "experiment_assignments_experimentId_variantKey_idx" ON "experiment_assignments"("experimentId","variantKey");

-- Keep append-heavy tables healthy today; at sustained multi-million row scale,
-- migrate commerce_events to monthly RANGE partitions without changing the API.

CREATE TYPE "WishlistStatus" AS ENUM ('ACTIVE', 'PURCHASED', 'REMOVED');

ALTER TABLE "products"
  ADD COLUMN "sku" TEXT,
  ADD COLUMN "brandName" TEXT,
  ADD COLUMN "storeName" TEXT,
  ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "ratingAverage" DECIMAL(3,2) NOT NULL DEFAULT 0,
  ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "ratingDistribution" JSONB;

CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

CREATE TABLE "wishlist_items" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "status" "WishlistStatus" NOT NULL DEFAULT 'ACTIVE',
  "plannedPurchaseAt" TIMESTAMP(3),
  "remindersEnabled" BOOLEAN NOT NULL DEFAULT false,
  "reminderTimezone" TEXT,
  "reminderVersion" INTEGER NOT NULL DEFAULT 1,
  "preReminderSentAt" TIMESTAMP(3),
  "followupReminderSentAt" TIMESTAMP(3),
  "purchasedAt" TIMESTAMP(3),
  "removedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wishlist_items_userId_productId_key"
  ON "wishlist_items"("userId", "productId");
CREATE INDEX "wishlist_items_userId_status_updatedAt_idx"
  ON "wishlist_items"("userId", "status", "updatedAt");
CREATE INDEX "wishlist_items_productId_status_idx"
  ON "wishlist_items"("productId", "status");
CREATE INDEX "wishlist_items_status_plannedPurchaseAt_idx"
  ON "wishlist_items"("status", "plannedPurchaseAt");

ALTER TABLE "wishlist_items"
  ADD CONSTRAINT "wishlist_items_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "wishlist_items"
  ADD CONSTRAINT "wishlist_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

WITH approved AS (
  SELECT
    "productId",
    ROUND(AVG("rating")::numeric, 2) AS average,
    COUNT(*)::integer AS count,
    jsonb_build_object(
      '1', COUNT(*) FILTER (WHERE "rating" = 1),
      '2', COUNT(*) FILTER (WHERE "rating" = 2),
      '3', COUNT(*) FILTER (WHERE "rating" = 3),
      '4', COUNT(*) FILTER (WHERE "rating" = 4),
      '5', COUNT(*) FILTER (WHERE "rating" = 5)
    ) AS distribution
  FROM "reviews"
  WHERE "status" = 'APPROVED'
  GROUP BY "productId"
)
UPDATE "products" AS product
SET
  "ratingAverage" = approved.average,
  "ratingCount" = approved.count,
  "ratingDistribution" = approved.distribution
FROM approved
WHERE product."id" = approved."productId";

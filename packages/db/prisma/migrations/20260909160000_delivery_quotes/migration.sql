-- Route-based delivery quotes. Prices and ETAs are operational data, never
-- guessed or embedded in the storefront.
CREATE TYPE "DeliveryFeeStatus" AS ENUM ('CONFIRMED', 'PENDING_QUOTE');

ALTER TABLE "orders"
  ADD COLUMN "deliveryFeeStatus" "DeliveryFeeStatus" NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN "deliveryOrigin" TEXT,
  ADD COLUMN "deliveryRateId" TEXT;

ALTER TABLE "fulfillment_configurations"
  ADD COLUMN "dispatchCounty" TEXT,
  ADD COLUMN "dispatchArea" TEXT;

CREATE TABLE "delivery_rates" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "method" "FulfillmentMethod" NOT NULL,
  "originCounty" TEXT NOT NULL,
  "originArea" TEXT,
  "destinationCounty" TEXT NOT NULL,
  "destinationArea" TEXT,
  "fee" DECIMAL(12,2) NOT NULL,
  "estimatedDeliveryTime" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "delivery_rates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_rates_method_isActive_archivedAt_priority_idx"
  ON "delivery_rates"("method", "isActive", "archivedAt", "priority");
CREATE INDEX "delivery_rates_originCounty_destinationCounty_idx"
  ON "delivery_rates"("originCounty", "destinationCounty");
CREATE INDEX "orders_deliveryRateId_idx" ON "orders"("deliveryRateId");

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_deliveryRateId_fkey"
  FOREIGN KEY ("deliveryRateId") REFERENCES "delivery_rates"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

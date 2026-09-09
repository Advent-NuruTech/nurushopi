-- Additive fulfillment support. Existing orders remain LEGACY and the
-- feature remains disabled until a senior admin explicitly enables it.
CREATE TYPE "FulfillmentMethod" AS ENUM ('LEGACY', 'PICKUP_STATION', 'DOORSTEP');

CREATE TABLE "fulfillment_configurations" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "featureEnabled" BOOLEAN NOT NULL DEFAULT false,
  "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
  "doorstepEnabled" BOOLEAN NOT NULL DEFAULT true,
  "doorstepFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "doorstepEstimatedDeliveryTime" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "fulfillment_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pickup_stations" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "city" TEXT,
  "region" TEXT,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "contactPhone" TEXT,
  "operatingHours" TEXT,
  "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "estimatedDeliveryTime" TEXT,
  "instructions" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "archivedAt" TIMESTAMP(3),
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pickup_stations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "orders"
  ADD COLUMN "fulfillmentMethod" "FulfillmentMethod" NOT NULL DEFAULT 'LEGACY',
  ADD COLUMN "pickupStationId" TEXT,
  ADD COLUMN "pickupStationName" TEXT,
  ADD COLUMN "pickupStationAddress" TEXT,
  ADD COLUMN "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryEta" TEXT;

CREATE INDEX "pickup_stations_isActive_archivedAt_displayOrder_idx"
  ON "pickup_stations"("isActive", "archivedAt", "displayOrder");
CREATE INDEX "pickup_stations_city_idx" ON "pickup_stations"("city");
CREATE INDEX "pickup_stations_region_idx" ON "pickup_stations"("region");
CREATE INDEX "orders_pickupStationId_idx" ON "orders"("pickupStationId");

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_pickupStationId_fkey"
  FOREIGN KEY ("pickupStationId") REFERENCES "pickup_stations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

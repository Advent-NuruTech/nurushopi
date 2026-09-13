ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'AT_PICKUP_STATION';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PICKED_UP';

CREATE TYPE "OrderStatusActorType" AS ENUM ('CUSTOMER', 'ADMIN', 'PICKUP_AGENT', 'SYSTEM');
CREATE TYPE "OrderNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "orders"
  ADD COLUMN "pickupReadyAt" TIMESTAMP(3),
  ADD COLUMN "pickedUpAt" TIMESTAMP(3);

CREATE TABLE "pickup_agents" (
  "id" TEXT NOT NULL,
  "stationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pickup_agents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_status_history" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "fromStatus" "OrderStatus",
  "toStatus" "OrderStatus" NOT NULL,
  "actorType" "OrderStatusActorType" NOT NULL,
  "actorId" TEXT,
  "actorName" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_notification_deliveries" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "status" "OrderNotificationStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "order_notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pickup_agents_email_key" ON "pickup_agents"("email");
CREATE INDEX "pickup_agents_stationId_isActive_idx" ON "pickup_agents"("stationId", "isActive");
CREATE INDEX "order_status_history_orderId_createdAt_idx" ON "order_status_history"("orderId", "createdAt");
CREATE UNIQUE INDEX "order_notification_deliveries_orderId_type_key" ON "order_notification_deliveries"("orderId", "type");
CREATE INDEX "order_notification_deliveries_status_updatedAt_idx" ON "order_notification_deliveries"("status", "updatedAt");

ALTER TABLE "pickup_agents" ADD CONSTRAINT "pickup_agents_stationId_fkey"
  FOREIGN KEY ("stationId") REFERENCES "pickup_stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_notification_deliveries" ADD CONSTRAINT "order_notification_deliveries_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "order_status_history" ("id", "orderId", "fromStatus", "toStatus", "actorType", "actorName", "note", "createdAt")
SELECT 'migration-' || "id", "id", NULL, "status", 'SYSTEM', 'NuruShop', 'Imported current order state', "createdAt"
FROM "orders";

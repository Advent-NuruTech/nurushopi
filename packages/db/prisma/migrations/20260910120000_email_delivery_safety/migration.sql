-- CreateTable
CREATE TABLE "email_suppressions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "providerMessageId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_webhook_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "recipientEmail" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "email_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_suppressions_email_key" ON "email_suppressions"("email");

-- CreateIndex
CREATE INDEX "email_suppressions_active_email_idx" ON "email_suppressions"("active", "email");

-- CreateIndex
CREATE INDEX "email_webhook_events_eventType_receivedAt_idx" ON "email_webhook_events"("eventType", "receivedAt");

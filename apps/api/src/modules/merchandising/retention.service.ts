import { prisma, Prisma, type NotificationPreference, type RetentionSubscription } from "@nuru/db";
import type { NotificationPreferenceInput, RetentionSubscriptionInput } from "@nuru/types";
import { Errors } from "../../lib/errors.js";

function inputJson(value: Record<string, unknown> | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

export function listPreferences(userId: string): Promise<NotificationPreference[]> {
  return prisma.notificationPreference.findMany({ where: { userId }, orderBy: [{ channel: "asc" }, { topic: "asc" }] });
}

export function savePreference(userId: string, input: NotificationPreferenceInput): Promise<NotificationPreference> {
  return prisma.notificationPreference.upsert({
    where: { userId_channel_topic: { userId, channel: input.channel, topic: input.topic } },
    create: {
      userId,
      ...input,
      quietHours: inputJson(input.quietHours),
      consentedAt: input.enabled ? new Date() : null,
    },
    update: {
      enabled: input.enabled,
      maxPerDay: input.maxPerDay,
      maxPerWeek: input.maxPerWeek,
      quietHours: inputJson(input.quietHours),
      ...(input.enabled ? { consentedAt: new Date() } : {}),
    },
  });
}

export async function subscribe(userId: string, input: RetentionSubscriptionInput): Promise<RetentionSubscription> {
  const product = await prisma.product.findUnique({ where: { id: input.productId }, select: { id: true } });
  if (!product) throw Errors.notFound("Product not found.");
  return prisma.retentionSubscription.upsert({
    where: {
      userId_productId_subscriptionType: {
        userId,
        productId: input.productId,
        subscriptionType: input.subscriptionType,
      },
    },
    create: { userId, productId: input.productId, subscriptionType: input.subscriptionType },
    update: { active: true },
  });
}

export function unsubscribe(userId: string, input: RetentionSubscriptionInput): Promise<Prisma.BatchPayload> {
  return prisma.retentionSubscription.updateMany({
    where: { userId, productId: input.productId, subscriptionType: input.subscriptionType },
    data: { active: false },
  });
}

/** Transactional outbox fan-out used by catalog/inventory writes. */
export async function scheduleProductEvent(
  tx: Prisma.TransactionClient,
  productId: string,
  triggerType: "back_in_stock" | "price_drop",
  payload: Prisma.InputJsonValue,
  now = new Date(),
) {
  const subscriptions = await tx.retentionSubscription.findMany({
    where: { productId, subscriptionType: triggerType, active: true },
    select: { userId: true },
  });
  if (!subscriptions.length) return 0;
  const eventBucket = now.toISOString().slice(0, 13);
  const result = await tx.retentionTrigger.createMany({
    data: subscriptions.map(({ userId }) => ({
      deduplicationKey: `${triggerType}:${productId}:${userId}:${eventBucket}`,
      userId,
      productId,
      triggerType,
      channel: "in_app",
      scheduledAt: now,
      expiresAt: new Date(now.getTime() + 7 * 86_400_000),
      payload,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

export async function dispatchRetentionBatch(now = new Date(), limit = 100): Promise<number> {
  const triggers = await prisma.retentionTrigger.findMany({
    where: { status: "PENDING", scheduledAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: [{ priority: "desc" }, { scheduledAt: "asc" }],
    take: Math.min(Math.max(limit, 1), 500),
    include: { product: { select: { name: true } } },
  });
  let sent = 0;
  for (const trigger of triggers) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.retentionTrigger.updateMany({
        where: { id: trigger.id, status: "PENDING" },
        data: { status: "CLAIMED", claimedAt: now, attemptCount: { increment: 1 } },
      });
      if (!claimed.count) return;
      const preference = await tx.notificationPreference.findUnique({
        where: { userId_channel_topic: { userId: trigger.userId, channel: trigger.channel, topic: trigger.triggerType } },
      });
      if (!preference?.enabled || !preference.consentedAt) {
        await tx.retentionTrigger.update({ where: { id: trigger.id }, data: { status: "SKIPPED", lastError: "No channel consent" } });
        return;
      }
      const startDay = new Date(now.getTime() - 86_400_000);
      const startWeek = new Date(now.getTime() - 7 * 86_400_000);
      const [today, week] = await Promise.all([
        tx.notification.count({ where: { recipientType: "USER", recipientId: trigger.userId, type: { startsWith: "retention:" }, createdAt: { gte: startDay } } }),
        tx.notification.count({ where: { recipientType: "USER", recipientId: trigger.userId, type: { startsWith: "retention:" }, createdAt: { gte: startWeek } } }),
      ]);
      if (today >= preference.maxPerDay || week >= preference.maxPerWeek) {
        await tx.retentionTrigger.update({ where: { id: trigger.id }, data: { status: "SKIPPED", lastError: "Frequency cap reached" } });
        return;
      }
      const title = trigger.triggerType === "back_in_stock" ? "Back in stock" : "Price reduced";
      await tx.notification.create({
        data: {
          recipientType: "USER",
          recipientId: trigger.userId,
          title,
          body: trigger.product ? `${trigger.product.name} is ${trigger.triggerType === "back_in_stock" ? "available again" : "now available at a lower price"}.` : null,
          type: `retention:${trigger.triggerType}`,
          relatedId: trigger.productId,
        },
      });
      await tx.retentionTrigger.update({ where: { id: trigger.id }, data: { status: "SENT", sentAt: now } });
      sent += 1;
    });
  }
  return sent;
}

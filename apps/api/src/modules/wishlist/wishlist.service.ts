import { randomUUID } from "node:crypto";
import { prisma, Prisma, type WishlistItem } from "@nuru/db";
import type { Paginated, WishlistItemDTO, WishlistQuery, WishlistUpsertInput } from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { toProductDTO, type ProductWithCategory } from "../catalog/serializers.js";

const DAY_MS = 86_400_000;
const productInclude = { category: { select: { id: true, name: true, slug: true } } } as const;

type WishlistWithProduct = WishlistItem & { product: ProductWithCategory };

export type WishlistReminderPhase = "before" | "followup";

/** Pure schedule calculation kept separate so time-zone/date edge cases are testable. */
export function wishlistReminderSchedule(plannedPurchaseAt: Date, now = new Date()) {
  const candidates: Array<{ phase: WishlistReminderPhase; scheduledAt: Date }> = [
    { phase: "before", scheduledAt: new Date(plannedPurchaseAt.getTime() - 2 * DAY_MS) },
    { phase: "followup", scheduledAt: new Date(plannedPurchaseAt.getTime() + 2 * DAY_MS) },
  ];
  // Saving a date inside the two-day window is already a fresh expression of
  // intent, so do not immediately send the "before" reminder.
  return candidates.filter((candidate) => candidate.scheduledAt > now);
}

function toWishlistDTO(row: WishlistWithProduct): WishlistItemDTO {
  const iso = (value: Date | null) => value?.toISOString() ?? null;
  return {
    id: row.id,
    userId: row.userId,
    productId: row.productId,
    status: row.status,
    plannedPurchaseAt: iso(row.plannedPurchaseAt),
    remindersEnabled: row.remindersEnabled,
    reminderTimezone: row.reminderTimezone,
    preReminderSentAt: iso(row.preReminderSentAt),
    followupReminderSentAt: iso(row.followupReminderSentAt),
    purchasedAt: iso(row.purchasedAt),
    removedAt: iso(row.removedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    product: toProductDTO(row.product),
  };
}

async function cancelPendingReminders(
  tx: Prisma.TransactionClient,
  userId: string,
  productId: string,
  reason: string,
) {
  await tx.retentionTrigger.updateMany({
    where: { userId, productId, triggerType: "wishlist", status: "PENDING" },
    data: { status: "SKIPPED", lastError: reason },
  });
}

async function scheduleReminders(tx: Prisma.TransactionClient, item: WishlistItem, now: Date) {
  if (!item.remindersEnabled || !item.plannedPurchaseAt) return;
  const schedules = wishlistReminderSchedule(item.plannedPurchaseAt, now);
  if (!schedules.length) return;
  await tx.retentionTrigger.createMany({
    data: schedules.map(({ phase, scheduledAt }) => ({
      deduplicationKey: `wishlist:${item.id}:v${item.reminderVersion}:${phase}`,
      userId: item.userId,
      productId: item.productId,
      triggerType: "wishlist",
      channel: "in_app",
      priority: phase === "before" ? 20 : 10,
      scheduledAt,
      expiresAt: new Date(item.plannedPurchaseAt!.getTime() + 14 * DAY_MS),
      payload: { wishlistItemId: item.id, reminderVersion: item.reminderVersion, phase },
    })),
    skipDuplicates: true,
  });
}

export async function list(
  userId: string,
  query: WishlistQuery,
): Promise<Paginated<WishlistItemDTO>> {
  const where: Prisma.WishlistItemWhereInput = { userId, status: query.status };
  const [total, rows] = await prisma.$transaction([
    prisma.wishlistItem.count({ where }),
    prisma.wishlistItem.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { product: { include: productInclude } },
    }),
  ]);
  return {
    items: rows.map((row) => toWishlistDTO(row as WishlistWithProduct)),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getForProduct(
  userId: string,
  productId: string,
): Promise<WishlistItemDTO | null> {
  const row = await prisma.wishlistItem.findUnique({
    where: { userId_productId: { userId, productId } },
    include: { product: { include: productInclude } },
  });
  return row?.status === "ACTIVE" ? toWishlistDTO(row as WishlistWithProduct) : null;
}

export async function upsert(userId: string, input: WishlistUpsertInput): Promise<WishlistItemDTO> {
  const now = new Date();
  if (input.plannedPurchaseAt) {
    const startToday = new Date(now);
    startToday.setUTCHours(0, 0, 0, 0);
    if (input.plannedPurchaseAt < startToday)
      throw Errors.badRequest("Planned purchase date cannot be in the past.");
    if (input.plannedPurchaseAt.getTime() > now.getTime() + 5 * 365 * DAY_MS) {
      throw Errors.badRequest("Planned purchase date is too far in the future.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { id: true, isActive: true },
    });
    if (!product?.isActive) throw Errors.notFound("Product not found.");
    const current = await tx.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId: input.productId } },
      select: { reminderVersion: true },
    });
    await cancelPendingReminders(tx, userId, input.productId, "Wishlist schedule changed");
    const item = await tx.wishlistItem.upsert({
      where: { userId_productId: { userId, productId: input.productId } },
      create: {
        userId,
        productId: input.productId,
        plannedPurchaseAt: input.plannedPurchaseAt ?? null,
        remindersEnabled: input.remindersEnabled,
        reminderTimezone: input.reminderTimezone ?? null,
      },
      update: {
        status: "ACTIVE",
        plannedPurchaseAt: input.plannedPurchaseAt ?? null,
        remindersEnabled: input.remindersEnabled,
        reminderTimezone: input.reminderTimezone ?? null,
        reminderVersion: (current?.reminderVersion ?? 0) + 1,
        preReminderSentAt: null,
        followupReminderSentAt: null,
        purchasedAt: null,
        removedAt: null,
      },
    });
    if (input.remindersEnabled) {
      await tx.notificationPreference.upsert({
        where: { userId_channel_topic: { userId, channel: "in_app", topic: "wishlist" } },
        create: { userId, channel: "in_app", topic: "wishlist", enabled: true, consentedAt: now },
        update: { enabled: true, consentedAt: now },
      });
      await scheduleReminders(tx, item, now);
    }
    await tx.commerceEvent.create({
      data: {
        eventId: randomUUID(),
        eventType: "wishlist_add",
        userId,
        productId: input.productId,
        trusted: true,
        occurredAt: now,
        source: "product_detail",
        metadata: {
          plannedPurchaseAt: input.plannedPurchaseAt?.toISOString() ?? null,
          remindersEnabled: input.remindersEnabled,
        },
      },
    });
    const hydrated = await tx.wishlistItem.findUniqueOrThrow({
      where: { id: item.id },
      include: { product: { include: productInclude } },
    });
    return toWishlistDTO(hydrated as WishlistWithProduct);
  });
}

export async function remove(userId: string, productId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const result = await tx.wishlistItem.updateMany({
      where: { userId, productId, status: "ACTIVE" },
      data: {
        status: "REMOVED",
        removedAt: new Date(),
        remindersEnabled: false,
        reminderVersion: { increment: 1 },
      },
    });
    if (!result.count) throw Errors.notFound("Saved item not found.");
    await cancelPendingReminders(tx, userId, productId, "Item removed from wishlist");
  });
}

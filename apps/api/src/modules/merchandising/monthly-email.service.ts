import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma, Prisma } from "@nuru/db";
import { env, marketingEmailConfigured } from "../../env.js";
import { EmailSendError, sendEmail } from "../auth/email.js";
import { loadEffectivePrices } from "./pricing.service.js";
import { renderMonthlyPromotionEmail, type MonthlyEmailProduct } from "./monthly-email.template.js";

const TOPIC = "monthly_promotion";
const CHANNEL = "email";
const PRODUCT_COUNT = 6;

function monthKey(now: Date): string {
  return now.toISOString().slice(0, 7);
}

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function startOfNextUtcMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

function tomorrowUtc(now: Date): Date {
  return new Date(startOfUtcDay(now).getTime() + 86_400_000);
}

/** Next 08:00 East Africa Time (UTC+3), avoiding overnight marketing mail. */
function nextKenyaMorning(now: Date): Date {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 5, 0, 0),
  );
  return now < today ? today : new Date(today.getTime() + 86_400_000);
}

function payloadProductIds(payload: Prisma.JsonValue | null): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const value = (payload as Record<string, unknown>).productIds;
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}

async function selectMonthlyProductIds(now: Date): Promise<string[]> {
  const promoted = await prisma.promotionProduct.findMany({
    where: {
      promotion: {
        status: { in: ["ACTIVE", "SCHEDULED"] },
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      product: { isActive: true, stock: { gt: 0 } },
    },
    select: { productId: true },
    take: PRODUCT_COUNT * 4,
  });
  const ids = [...new Set(promoted.map((item) => item.productId))].slice(0, PRODUCT_COUNT);
  if (ids.length < PRODUCT_COUNT) {
    const fallback = await prisma.product.findMany({
      where: { id: { notIn: ids }, isActive: true, stock: { gt: 0 } },
      orderBy: [{ isFeatured: "desc" }, { ratingAverage: "desc" }, { createdAt: "desc" }],
      select: { id: true },
      take: PRODUCT_COUNT - ids.length,
    });
    ids.push(...fallback.map((product) => product.id));
  }
  return ids;
}

/**
 * Creates one durable email trigger per opted-in customer for the current
 * calendar month. A stable deduplication key makes repeated cron runs safe.
 */
export async function scheduleMonthlyPromotionEmails(now = new Date()): Promise<number> {
  if (!marketingEmailConfigured) return 0;
  const period = monthKey(now);
  const alreadyScheduled = await prisma.retentionTrigger.findFirst({
    where: { deduplicationKey: { startsWith: `${TOPIC}:${period}:` } },
    select: { id: true },
  });
  if (alreadyScheduled) return 0;

  const productIds = await selectMonthlyProductIds(now);
  if (!productIds.length) return 0;

  const eligibleWhere: Prisma.NotificationPreferenceWhereInput = {
    channel: CHANNEL,
    topic: TOPIC,
    enabled: true,
    consentedAt: { not: null },
    user: { isActive: true, emailVerified: { not: null } },
  };
  const eligibleCount = await prisma.notificationPreference.count({ where: eligibleWhere });
  if (!eligibleCount) return 0;

  // Rotate the starting point each month if the audience is larger than the
  // monthly allowance, so the same customers are not permanently excluded.
  const take = Math.min(eligibleCount, env.MARKETING_EMAIL_MONTHLY_LIMIT);
  const monthNumber = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const offset = eligibleCount > take ? (monthNumber * take) % eligibleCount : 0;
  const first = await prisma.notificationPreference.findMany({
    where: eligibleWhere,
    orderBy: { userId: "asc" },
    select: { userId: true },
    skip: offset,
    take,
  });
  const remaining = take - first.length;
  const wrapped =
    remaining > 0
      ? await prisma.notificationPreference.findMany({
          where: eligibleWhere,
          orderBy: { userId: "asc" },
          select: { userId: true },
          take: remaining,
        })
      : [];
  const recipients = [...first, ...wrapped];
  const scheduledAt = nextKenyaMorning(now);
  const expiresAt = startOfNextUtcMonth(now);
  if (scheduledAt >= expiresAt) return 0;
  const result = await prisma.retentionTrigger.createMany({
    data: recipients.map(({ userId }) => ({
      deduplicationKey: `${TOPIC}:${period}:${userId}`,
      userId,
      triggerType: TOPIC,
      channel: CHANNEL,
      priority: -10,
      scheduledAt,
      expiresAt,
      payload: { period, productIds },
    })),
    skipDuplicates: true,
  });
  return result.count;
}

interface ClaimedEmail {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  attemptCount: number;
  payload: Prisma.JsonValue | null;
  deduplicationKey: string;
}

async function claimNextEmail(now: Date): Promise<ClaimedEmail | "cap" | "empty" | "skipped"> {
  return prisma.$transaction(
    async (tx) => {
      const [dailyUsed, monthlyUsed] = await Promise.all([
        tx.retentionTrigger.count({
          where: {
            triggerType: TOPIC,
            channel: CHANNEL,
            status: { in: ["CLAIMED", "SENT"] },
            claimedAt: { gte: startOfUtcDay(now) },
          },
        }),
        tx.retentionTrigger.count({
          where: {
            triggerType: TOPIC,
            channel: CHANNEL,
            status: { in: ["CLAIMED", "SENT"] },
            claimedAt: { gte: startOfUtcMonth(now) },
          },
        }),
      ]);
      if (
        dailyUsed >= env.MARKETING_EMAIL_DAILY_LIMIT ||
        monthlyUsed >= env.MARKETING_EMAIL_MONTHLY_LIMIT
      )
        return "cap" as const;

      const trigger = await tx.retentionTrigger.findFirst({
        where: {
          triggerType: TOPIC,
          channel: CHANNEL,
          status: "PENDING",
          scheduledAt: { lte: now },
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
        include: {
          user: { select: { email: true, name: true, isActive: true, emailVerified: true } },
        },
      });
      if (!trigger) return "empty" as const;
      const preference = await tx.notificationPreference.findUnique({
        where: { userId_channel_topic: { userId: trigger.userId, channel: CHANNEL, topic: TOPIC } },
      });
      if (
        !preference?.enabled ||
        !preference.consentedAt ||
        !trigger.user.isActive ||
        !trigger.user.emailVerified
      ) {
        await tx.retentionTrigger.update({
          where: { id: trigger.id },
          data: {
            status: "SKIPPED",
            lastError: "Email consent or eligibility is no longer active",
          },
        });
        return "skipped" as const;
      }
      const suppression = await tx.emailSuppression.findUnique({
        where: { email: trigger.user.email.trim().toLowerCase() },
        select: { active: true },
      });
      if (suppression?.active) {
        await tx.retentionTrigger.update({
          where: { id: trigger.id },
          data: { status: "SKIPPED", lastError: "Recipient is on the email suppression list" },
        });
        return "skipped" as const;
      }
      const claimed = await tx.retentionTrigger.updateMany({
        where: { id: trigger.id, status: "PENDING" },
        data: {
          status: "CLAIMED",
          claimedAt: now,
          attemptCount: { increment: 1 },
          lastError: null,
        },
      });
      if (!claimed.count) return "skipped" as const;
      return {
        id: trigger.id,
        userId: trigger.userId,
        email: trigger.user.email,
        name: trigger.user.name,
        attemptCount: trigger.attemptCount + 1,
        payload: trigger.payload,
        deduplicationKey: trigger.deduplicationKey,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

async function loadEmailProducts(ids: string[], now: Date): Promise<MonthlyEmailProduct[]> {
  if (!ids.length) return [];
  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: ids }, isActive: true, stock: { gt: 0 } },
      select: {
        id: true,
        name: true,
        slug: true,
        images: true,
        price: true,
        sellingPrice: true,
        originalPrice: true,
        ratingAverage: true,
        ratingCount: true,
      },
    });
    const prices = await loadEffectivePrices(tx, products, now);
    const byId = new Map(products.map((product) => [product.id, product]));
    return ids.flatMap((id) => {
      const product = byId.get(id);
      if (!product) return [];
      const effective = prices.get(id);
      const price = Number(effective?.effectivePrice ?? product.sellingPrice ?? product.price);
      const base = Number(product.sellingPrice ?? product.price);
      const catalogueOriginal = product.originalPrice ? Number(product.originalPrice) : null;
      const originalPrice =
        price < base
          ? base
          : catalogueOriginal && catalogueOriginal > price
            ? catalogueOriginal
            : null;
      return [
        {
          id: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: product.images[0] ?? null,
          price,
          originalPrice,
          rating: Number(product.ratingAverage),
          ratingCount: product.ratingCount,
        },
      ];
    });
  });
}

function signature(userId: string): Buffer {
  return createHmac("sha256", env.JWT_ACCESS_SECRET)
    .update(`unsubscribe:${TOPIC}:${userId}`)
    .digest();
}

export function createMarketingUnsubscribeToken(userId: string): string {
  return `${Buffer.from(userId).toString("base64url")}.${signature(userId).toString("base64url")}`;
}

export function readMarketingUnsubscribeToken(token: string): string | null {
  const [encodedUserId, encodedSignature, extra] = token.split(".");
  if (!encodedUserId || !encodedSignature || extra) return null;
  try {
    const userId = Buffer.from(encodedUserId, "base64url").toString("utf8");
    const supplied = Buffer.from(encodedSignature, "base64url");
    const expected = signature(userId);
    return supplied.length === expected.length && timingSafeEqual(supplied, expected)
      ? userId
      : null;
  } catch {
    return null;
  }
}

export async function unsubscribeMonthlyPromotion(token: string): Promise<boolean> {
  const userId = readMarketingUnsubscribeToken(token);
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return false;
  await prisma.$transaction([
    prisma.notificationPreference.upsert({
      where: { userId_channel_topic: { userId, channel: CHANNEL, topic: TOPIC } },
      create: {
        userId,
        channel: CHANNEL,
        topic: TOPIC,
        enabled: false,
        maxPerDay: 1,
        maxPerWeek: 1,
      },
      update: { enabled: false },
    }),
    prisma.retentionTrigger.updateMany({
      where: { userId, channel: CHANNEL, triggerType: TOPIC, status: "PENDING" },
      data: { status: "SKIPPED", lastError: "Customer unsubscribed" },
    }),
  ]);
  return true;
}

export async function dispatchMonthlyPromotionEmails(now = new Date()): Promise<number> {
  if (!marketingEmailConfigured) return 0;
  let sent = 0;
  let attempted = 0;
  let scans = 0;
  while (attempted < env.MARKETING_EMAIL_BATCH_SIZE && scans < env.MARKETING_EMAIL_BATCH_SIZE * 3) {
    scans += 1;
    const claimed = await claimNextEmail(now);
    if (claimed === "cap" || claimed === "empty") break;
    if (claimed === "skipped") continue;
    const products = await loadEmailProducts(payloadProductIds(claimed.payload), now);
    if (!products.length) {
      await prisma.retentionTrigger.update({
        where: { id: claimed.id },
        data: { status: "SKIPPED", lastError: "No eligible in-stock products" },
      });
      continue;
    }
    attempted += 1;
    const unsubscribeToken = createMarketingUnsubscribeToken(claimed.userId);
    const unsubscribeUrl = `${env.API_PUBLIC_URL}/api/v1/email/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
    const monthLabel = new Intl.DateTimeFormat("en-KE", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(now);
    const content = renderMonthlyPromotionEmail({
      customerName: claimed.name,
      monthLabel,
      products,
      shopUrl: env.WEB_APP_URL.replace(/\/$/, ""),
      unsubscribeUrl,
      businessAddress: env.EMAIL_BUSINESS_ADDRESS,
    });
    try {
      const result = await sendEmail({
        to: claimed.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        idempotencyKey: claimed.deduplicationKey,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-Entity-Ref-ID": claimed.deduplicationKey,
        },
        tags: [{ name: "campaign", value: `monthly-${monthKey(now)}` }],
      });
      const payload =
        claimed.payload && typeof claimed.payload === "object" && !Array.isArray(claimed.payload)
          ? {
              ...(claimed.payload as Record<string, Prisma.JsonValue>),
              providerMessageId: result.id,
            }
          : { providerMessageId: result.id };
      await prisma.retentionTrigger.update({
        where: { id: claimed.id },
        data: { status: "SENT", sentAt: new Date(), payload: payload as Prisma.InputJsonValue },
      });
      sent += 1;
    } catch (error) {
      const emailError = error instanceof EmailSendError ? error : null;
      const retryable =
        !emailError?.status || emailError.status === 429 || emailError.status >= 500;
      const retryAt =
        emailError?.code === "monthly_quota_exceeded"
          ? startOfNextUtcMonth(now)
          : emailError?.code === "daily_quota_exceeded"
            ? tomorrowUtc(now)
            : new Date(now.getTime() + Math.max(emailError?.retryAfterSeconds ?? 300, 60) * 1_000);
      await prisma.retentionTrigger.update({
        where: { id: claimed.id },
        data:
          retryable && claimed.attemptCount < 6
            ? {
                status: "PENDING",
                claimedAt: null,
                scheduledAt: retryAt,
                lastError: String(error).slice(0, 500),
              }
            : { status: "FAILED", lastError: String(error).slice(0, 500) },
      });
    }
    if (attempted < env.MARKETING_EMAIL_BATCH_SIZE) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.ceil(1_000 / env.MARKETING_EMAIL_RATE_PER_SECOND)),
      );
    }
  }
  return sent;
}

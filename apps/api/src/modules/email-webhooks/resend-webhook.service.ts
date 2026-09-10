import { prisma, Prisma } from "@nuru/db";
import { z } from "zod";

const suppressionEvents = new Set(["email.bounced", "email.complained", "email.suppressed"]);

const resendEventSchema = z
  .object({
    type: z.string().min(1),
    created_at: z.string().optional(),
    data: z
      .object({
        email_id: z.string().optional(),
        to: z.union([z.string(), z.array(z.string())]).optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type ResendWebhookEvent = z.infer<typeof resendEventSchema>;

function normalizeRecipients(to: string | string[] | undefined): string[] {
  const values = Array.isArray(to) ? to : to ? [to] : [];
  return [
    ...new Set(
      values
        .map((email) => email.trim().toLowerCase())
        .filter((email) => z.string().email().safeParse(email).success),
    ),
  ];
}

export function parseResendWebhookEvent(value: unknown): ResendWebhookEvent {
  return resendEventSchema.parse(value);
}

export interface ProcessWebhookResult {
  duplicate: boolean;
  suppressed: number;
}

/**
 * Records every authenticated event once. Permanent negative delivery events
 * become local suppressions and revoke all optional email preferences.
 */
export async function processResendWebhookEvent(
  eventId: string,
  event: ResendWebhookEvent,
): Promise<ProcessWebhookResult> {
  const recipients = normalizeRecipients(event.data.to);
  const shouldSuppress = suppressionEvents.has(event.type);

  try {
    return await prisma.$transaction(
      async (tx) => {
        const existing = await tx.emailWebhookEvent.findUnique({
          where: { id: eventId },
          select: { id: true },
        });
        if (existing) return { duplicate: true, suppressed: 0 };

        await tx.emailWebhookEvent.create({
          data: {
            id: eventId,
            eventType: event.type,
            providerMessageId: event.data.email_id ?? null,
            recipientEmail: recipients[0] ?? null,
          },
        });

        if (shouldSuppress && recipients.length) {
          for (const email of recipients) {
            await tx.emailSuppression.upsert({
              where: { email },
              create: {
                email,
                reason: event.type,
                sourceEventId: eventId,
                providerMessageId: event.data.email_id ?? null,
              },
              update: {
                active: true,
                reason: event.type,
                sourceEventId: eventId,
                providerMessageId: event.data.email_id ?? null,
              },
            });
          }

          const users = await tx.user.findMany({
            where: { email: { in: recipients } },
            select: { id: true },
          });
          const userIds = users.map((user) => user.id);
          if (userIds.length) {
            await tx.notificationPreference.updateMany({
              where: { userId: { in: userIds }, channel: "email", enabled: true },
              data: { enabled: false },
            });
            await tx.retentionTrigger.updateMany({
              where: { userId: { in: userIds }, channel: "email", status: "PENDING" },
              data: { status: "SKIPPED", lastError: `Email suppressed after ${event.type}` },
            });
          }
        }

        await tx.emailWebhookEvent.update({
          where: { id: eventId },
          data: { processedAt: new Date() },
        });
        return { duplicate: false, suppressed: shouldSuppress ? recipients.length : 0 };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    // Concurrent retries can both pass findUnique; the primary key still makes
    // the second transaction harmless and should receive a success response.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { duplicate: true, suppressed: 0 };
    }
    throw error;
  }
}

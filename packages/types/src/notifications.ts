import { z } from "zod";
import { emailSchema } from "./auth.js";
import { paginationQuerySchema } from "./catalog.js";

// ---------------------------------------------------------------------------
// Engagement: notifications, support messages, contact form
//
// • Notifications are one-way system/admin → recipient signals (order updates,
//   security alerts, broadcasts). recipientId === null means a broadcast to
//   every member of recipientType.
// • Messages form a two-party support thread between a user and the admin team.
//   A thread is keyed by the user's id (one support conversation per user), so
//   threadId === userId throughout.
// • Contact is the unauthenticated "get in touch" form.
// ---------------------------------------------------------------------------

/** Who a notification is addressed to. Mirrors `NotificationRecipientType`. */
export const NOTIFICATION_RECIPIENT_TYPES = ["USER", "ADMIN"] as const;
export type NotificationRecipientType = (typeof NOTIFICATION_RECIPIENT_TYPES)[number];

/** Who authored a message. Mirrors the Prisma `MessageSenderType` enum. */
export const MESSAGE_SENDER_TYPES = ["USER", "ADMIN"] as const;
export type MessageSenderType = (typeof MESSAGE_SENDER_TYPES)[number];

// ---- Notifications ----

/** Listing filters for a recipient's own notifications (merged w/ pagination). */
export const notificationQuerySchema = paginationQuerySchema.extend({
  read: z.coerce.boolean().optional(),
  type: z.string().trim().max(40).optional(),
});
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;

/**
 * Admin payload to dispatch a notification to users. `recipientId` null means a
 * broadcast to all users; otherwise a single target user.
 */
export const notificationCreateSchema = z
  .object({
    recipientId: z.string().cuid("Invalid user reference.").optional().nullable(),
    title: z.string().trim().min(1, "Title is required.").max(160),
    body: z.string().trim().max(2000).optional().nullable(),
    type: z.string().trim().max(40).optional().nullable(),
    relatedId: z.string().trim().max(60).optional().nullable(),
  })
  .strict();
export type NotificationCreateInput = z.infer<typeof notificationCreateSchema>;

export interface NotificationDTO {
  id: string;
  recipientType: NotificationRecipientType;
  recipientId: string | null;
  title: string;
  body: string | null;
  type: string | null;
  relatedId: string | null;
  read: boolean;
  createdAt: string;
}

// ---- Support messages ----

/** Send a message into a support thread. */
export const messageCreateSchema = z
  .object({
    body: z.string().trim().min(1, "Message cannot be empty.").max(4000),
    attachments: z
      .array(z.string().url("Each attachment must be a valid URL."))
      .max(5, "Too many attachments.")
      .default([]),
  })
  .strict();
export type MessageCreateInput = z.infer<typeof messageCreateSchema>;

export interface MessageDTO {
  id: string;
  threadId: string;
  senderType: MessageSenderType;
  senderUserId: string | null;
  senderAdminId: string | null;
  body: string;
  attachments: string[];
  read: boolean;
  createdAt: string;
}

/** A support thread summary for the admin inbox. */
export interface MessageThreadDTO {
  threadId: string;
  userId: string;
  userName: string | null;
  lastMessage: string;
  lastMessageAt: string;
  /** Unread inbound (USER → admin) messages in this thread. */
  unreadCount: number;
  messageCount: number;
}

// ---- Contact form ----

export const contactCreateSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required.").max(120),
    email: emailSchema.optional().nullable(),
    phone: z.string().trim().max(32).optional().nullable(),
    subject: z.string().trim().max(200).optional().nullable(),
    message: z.string().trim().min(1, "Message is required.").max(4000),
  })
  .strict();
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;

export const contactQuerySchema = paginationQuerySchema.extend({
  handled: z.coerce.boolean().optional(),
  search: z.string().trim().max(120).optional(),
});
export type ContactQuery = z.infer<typeof contactQuerySchema>;

export const contactUpdateSchema = z.object({ handled: z.coerce.boolean() }).strict();
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;

export interface ContactDTO {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  handled: boolean;
  createdAt: string;
}

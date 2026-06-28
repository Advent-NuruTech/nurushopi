import type { Contact, Message, Notification } from "@nuru/db";
import type {
  ContactDTO,
  MessageDTO,
  MessageSenderType,
  NotificationDTO,
  NotificationRecipientType,
} from "@nuru/types";

export function toNotificationDTO(n: Notification): NotificationDTO {
  return {
    id: n.id,
    recipientType: n.recipientType as NotificationRecipientType,
    recipientId: n.recipientId,
    title: n.title,
    body: n.body,
    type: n.type,
    relatedId: n.relatedId,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  };
}

export function toMessageDTO(m: Message): MessageDTO {
  return {
    id: m.id,
    threadId: m.threadId,
    senderType: m.senderType as MessageSenderType,
    senderUserId: m.senderUserId,
    senderAdminId: m.senderAdminId,
    body: m.body,
    attachments: m.attachments,
    read: m.read,
    createdAt: m.createdAt.toISOString(),
  };
}

export function toContactDTO(c: Contact): ContactDTO {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    subject: c.subject,
    message: c.message,
    handled: c.handled,
    createdAt: c.createdAt.toISOString(),
  };
}

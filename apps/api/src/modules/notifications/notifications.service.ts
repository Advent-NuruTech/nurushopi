import { prisma, Prisma } from "@nuru/db";
import type {
  ContactCreateInput,
  ContactDTO,
  ContactQuery,
  MessageCreateInput,
  MessageDTO,
  MessageThreadDTO,
  NotificationCreateInput,
  NotificationDTO,
  NotificationQuery,
  Paginated,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { toContactDTO, toMessageDTO, toNotificationDTO } from "./serializers.js";

// ===========================================================================
// Notifications
//
// A notification addressed to a specific recipient has recipientId set; a
// broadcast has recipientId === null and is visible to every member of the
// recipientType. Per-recipient read state only applies to targeted rows (a
// broadcast row is shared), so unread counts and mark-read operate on targeted
// notifications the caller owns; broadcasts are always listed but never counted.
// ===========================================================================

/** A recipient sees their own targeted rows plus broadcasts to their type. */
function recipientWhere(
  recipientType: "USER" | "ADMIN",
  recipientId: string,
): Prisma.NotificationWhereInput {
  return {
    recipientType,
    OR: [{ recipientId }, { recipientId: null }],
  };
}

async function listNotifications(
  recipientType: "USER" | "ADMIN",
  recipientId: string,
  query: NotificationQuery,
): Promise<Paginated<NotificationDTO> & { unreadCount: number }> {
  const where: Prisma.NotificationWhereInput = recipientWhere(recipientType, recipientId);
  if (query.read !== undefined) where.read = query.read;
  if (query.type) where.type = query.type;

  const skip = (query.page - 1) * query.pageSize;
  const [total, rows, unreadCount] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize,
    }),
    prisma.notification.count({ where: { recipientType, recipientId, read: false } }),
  ]);

  return {
    items: rows.map(toNotificationDTO),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    unreadCount,
  };
}

export function listForUser(userId: string, query: NotificationQuery) {
  return listNotifications("USER", userId, query);
}

export function listForAdmin(adminId: string, query: NotificationQuery) {
  return listNotifications("ADMIN", adminId, query);
}

export async function unreadCount(
  recipientType: "USER" | "ADMIN",
  recipientId: string,
): Promise<number> {
  return prisma.notification.count({
    where: { recipientType, recipientId, read: false },
  });
}

/** Mark a single targeted notification read; only the owner may do so. */
export async function markRead(
  recipientType: "USER" | "ADMIN",
  recipientId: string,
  id: string,
): Promise<NotificationDTO> {
  const current = await prisma.notification.findUnique({ where: { id } });
  if (!current || current.recipientType !== recipientType || current.recipientId !== recipientId) {
    throw Errors.notFound("Notification not found.");
  }
  const updated = await prisma.notification.update({ where: { id }, data: { read: true } });
  return toNotificationDTO(updated);
}

/** Mark every targeted, unread notification for the recipient as read. */
export async function markAllRead(
  recipientType: "USER" | "ADMIN",
  recipientId: string,
): Promise<number> {
  const res = await prisma.notification.updateMany({
    where: { recipientType, recipientId, read: false },
    data: { read: true },
  });
  return res.count;
}

/**
 * Admin dispatch of a user-facing notification. A null recipientId broadcasts to
 * all users; otherwise it targets one user (validated to exist).
 */
export async function createForUsers(input: NotificationCreateInput): Promise<NotificationDTO> {
  if (input.recipientId) {
    const user = await prisma.user.findUnique({
      where: { id: input.recipientId },
      select: { id: true },
    });
    if (!user) throw Errors.notFound("Target user not found.");
  }

  const created = await prisma.notification.create({
    data: {
      recipientType: "USER",
      recipientId: input.recipientId ?? null,
      title: input.title,
      body: input.body ?? null,
      type: input.type ?? null,
      relatedId: input.relatedId ?? null,
    },
  });
  return toNotificationDTO(created);
}

// ===========================================================================
// Support messages (user ↔ admin), keyed by threadId === userId
// ===========================================================================

/** The user's own thread: list messages and mark admin replies as read. */
export async function listMyMessages(userId: string): Promise<MessageDTO[]> {
  const rows = await prisma.$transaction(async (tx) => {
    await tx.message.updateMany({
      where: { threadId: userId, senderType: "ADMIN", read: false },
      data: { read: true },
    });
    return tx.message.findMany({ where: { threadId: userId }, orderBy: { createdAt: "asc" } });
  });
  return rows.map(toMessageDTO);
}

export async function sendAsUser(userId: string, input: MessageCreateInput): Promise<MessageDTO> {
  const created = await prisma.message.create({
    data: {
      threadId: userId,
      senderType: "USER",
      senderUserId: userId,
      body: input.body,
      attachments: input.attachments,
    },
  });
  return toMessageDTO(created);
}

/** Admin inbox: one row per thread with its last message + unread inbound count. */
export async function adminListThreads(
  page: number,
  pageSize: number,
): Promise<Paginated<MessageThreadDTO>> {
  const allThreads = await prisma.message.groupBy({
    by: ["threadId"],
    orderBy: { threadId: "asc" },
  });
  const total = allThreads.length;

  const grouped = await prisma.message.groupBy({
    by: ["threadId"],
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const threadIds = grouped.map((g) => g.threadId);
  const users = await prisma.user.findMany({
    where: { id: { in: threadIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  const items = await Promise.all(
    threadIds.map(async (threadId): Promise<MessageThreadDTO> => {
      const [last, messageCount, unreadCount] = await prisma.$transaction([
        prisma.message.findFirst({ where: { threadId }, orderBy: { createdAt: "desc" } }),
        prisma.message.count({ where: { threadId } }),
        prisma.message.count({ where: { threadId, senderType: "USER", read: false } }),
      ]);
      return {
        threadId,
        userId: threadId,
        userName: nameById.get(threadId) ?? null,
        lastMessage: last?.body ?? "",
        lastMessageAt: (last?.createdAt ?? new Date(0)).toISOString(),
        unreadCount,
        messageCount,
      };
    }),
  );

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Admin view of one thread: list messages and mark inbound (user) ones read. */
export async function adminListThread(threadId: string): Promise<MessageDTO[]> {
  const rows = await prisma.$transaction(async (tx) => {
    await tx.message.updateMany({
      where: { threadId, senderType: "USER", read: false },
      data: { read: true },
    });
    return tx.message.findMany({ where: { threadId }, orderBy: { createdAt: "asc" } });
  });
  return rows.map(toMessageDTO);
}

/**
 * Admin reply into a thread. Also drops a notification to the thread owner so
 * they learn a reply is waiting without polling.
 */
export async function adminReply(
  threadId: string,
  adminId: string,
  input: MessageCreateInput,
): Promise<MessageDTO> {
  const created = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        threadId,
        senderType: "ADMIN",
        senderAdminId: adminId,
        body: input.body,
        attachments: input.attachments,
      },
    });
    await tx.notification.create({
      data: {
        recipientType: "USER",
        recipientId: threadId,
        title: "New reply from support",
        body: input.body.slice(0, 280),
        type: "message",
        relatedId: threadId,
      },
    });
    return message;
  });
  return toMessageDTO(created);
}

// ===========================================================================
// Contact form
// ===========================================================================

export async function submitContact(input: ContactCreateInput): Promise<ContactDTO> {
  const created = await prisma.contact.create({
    data: {
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      subject: input.subject ?? null,
      message: input.message,
    },
  });
  return toContactDTO(created);
}

export async function adminListContacts(query: ContactQuery): Promise<Paginated<ContactDTO>> {
  const where: Prisma.ContactWhereInput = {};
  if (query.handled !== undefined) where.handled = query.handled;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { subject: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const skip = (query.page - 1) * query.pageSize;
  const [total, rows] = await prisma.$transaction([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map(toContactDTO),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function adminSetContactHandled(id: string, handled: boolean): Promise<ContactDTO> {
  const current = await prisma.contact.findUnique({ where: { id }, select: { id: true } });
  if (!current) throw Errors.notFound("Contact message not found.");
  const updated = await prisma.contact.update({ where: { id }, data: { handled } });
  return toContactDTO(updated);
}

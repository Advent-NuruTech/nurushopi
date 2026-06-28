import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@nuru/db", async () => {
  const { makeDbMock } = await import("../helpers/dbMock.js");
  return makeDbMock();
});

import { prisma } from "@nuru/db";
import * as svc from "../../src/modules/notifications/notifications.service.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
const p = prisma as any;

function notif(overrides: Record<string, unknown> = {}) {
  return {
    id: "n1",
    recipientType: "USER",
    recipientId: "u1",
    title: "Hi",
    body: null,
    type: null,
    relatedId: null,
    read: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function msg(overrides: Record<string, unknown> = {}) {
  return {
    id: "m1",
    threadId: "u1",
    senderType: "USER",
    senderUserId: "u1",
    senderAdminId: null,
    body: "Hello",
    attachments: [],
    read: false,
    createdAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  p.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(p)
      : Promise.all(arg as Promise<unknown>[]),
  );
});

describe("notifications.listForUser", () => {
  it("includes targeted + broadcast rows and a targeted-only unread count", async () => {
    p.notification.count
      .mockResolvedValueOnce(5) // total matching list filter
      .mockResolvedValueOnce(2); // unread (targeted only)
    p.notification.findMany.mockResolvedValue([notif()]);

    const res = await svc.listForUser("u1", { page: 1, pageSize: 20 } as never);

    expect(res.total).toBe(5);
    expect(res.unreadCount).toBe(2);
    expect(p.notification.findMany.mock.calls[0][0].where).toEqual({
      recipientType: "USER",
      OR: [{ recipientId: "u1" }, { recipientId: null }],
    });
    // Unread count is scoped to targeted rows only (broadcasts excluded).
    expect(p.notification.count.mock.calls[1][0].where).toEqual({
      recipientType: "USER",
      recipientId: "u1",
      read: false,
    });
  });
});

describe("notifications.markRead", () => {
  it("marks a targeted notification owned by the caller", async () => {
    p.notification.findUnique.mockResolvedValue(notif());
    p.notification.update.mockResolvedValue(notif({ read: true }));
    const dto = await svc.markRead("USER", "u1", "n1");
    expect(dto.read).toBe(true);
  });

  it("404s when the notification belongs to another recipient", async () => {
    p.notification.findUnique.mockResolvedValue(notif({ recipientId: "other" }));
    await expect(svc.markRead("USER", "u1", "n1")).rejects.toMatchObject({ status: 404 });
    expect(p.notification.update).not.toHaveBeenCalled();
  });

  it("404s when trying to mark a broadcast (no per-user read state)", async () => {
    p.notification.findUnique.mockResolvedValue(notif({ recipientId: null }));
    await expect(svc.markRead("USER", "u1", "n1")).rejects.toMatchObject({ status: 404 });
  });
});

describe("notifications.createForUsers", () => {
  it("broadcasts when no recipientId is given", async () => {
    p.notification.create.mockResolvedValue(notif({ recipientId: null }));
    await svc.createForUsers({ title: "Sale!", body: null, type: null, relatedId: null } as never);
    expect(p.user.findUnique).not.toHaveBeenCalled();
    expect(p.notification.create.mock.calls[0][0].data).toMatchObject({
      recipientType: "USER",
      recipientId: null,
      title: "Sale!",
    });
  });

  it("validates a targeted user exists, else 404", async () => {
    p.user.findUnique.mockResolvedValue(null);
    await expect(
      svc.createForUsers({ recipientId: "u9", title: "Hi", body: null, type: null, relatedId: null } as never),
    ).rejects.toMatchObject({ status: 404 });
    expect(p.notification.create).not.toHaveBeenCalled();
  });
});

describe("messages: customer thread", () => {
  it("listMyMessages marks admin replies read then returns the thread", async () => {
    p.message.updateMany.mockResolvedValue({ count: 1 });
    p.message.findMany.mockResolvedValue([msg({ senderType: "ADMIN", senderAdminId: "a1" })]);

    const out = await svc.listMyMessages("u1");

    expect(out).toHaveLength(1);
    expect(p.message.updateMany.mock.calls[0][0]).toEqual({
      where: { threadId: "u1", senderType: "ADMIN", read: false },
      data: { read: true },
    });
    expect(p.message.findMany.mock.calls[0][0].where).toEqual({ threadId: "u1" });
  });

  it("sendAsUser writes a USER message into the caller's own thread", async () => {
    p.message.create.mockResolvedValue(msg());
    await svc.sendAsUser("u1", { body: "Help", attachments: [] } as never);
    expect(p.message.create.mock.calls[0][0].data).toMatchObject({
      threadId: "u1",
      senderType: "USER",
      senderUserId: "u1",
      body: "Help",
    });
  });
});

describe("messages: admin", () => {
  it("adminReply posts an ADMIN message and notifies the thread owner", async () => {
    p.message.create.mockResolvedValue(msg({ senderType: "ADMIN", senderAdminId: "a1" }));
    p.notification.create.mockResolvedValue(notif({ type: "message" }));

    await svc.adminReply("u1", "a1", { body: "On it", attachments: [] } as never);

    expect(p.message.create.mock.calls[0][0].data).toMatchObject({
      threadId: "u1",
      senderType: "ADMIN",
      senderAdminId: "a1",
    });
    expect(p.notification.create.mock.calls[0][0].data).toMatchObject({
      recipientType: "USER",
      recipientId: "u1",
      type: "message",
    });
  });

  it("adminListThread marks inbound user messages read", async () => {
    p.message.updateMany.mockResolvedValue({ count: 2 });
    p.message.findMany.mockResolvedValue([msg()]);
    await svc.adminListThread("u1");
    expect(p.message.updateMany.mock.calls[0][0].where).toEqual({
      threadId: "u1",
      senderType: "USER",
      read: false,
    });
  });

  it("adminListThreads summarises each thread with unread + last message", async () => {
    p.message.groupBy
      .mockResolvedValueOnce([{ threadId: "u1" }, { threadId: "u2" }]) // total distinct
      .mockResolvedValueOnce([{ threadId: "u1", _max: { createdAt: new Date() } }]); // page
    p.user.findMany.mockResolvedValue([{ id: "u1", name: "Alice" }]);
    p.message.findFirst.mockResolvedValue(msg({ body: "latest" }));
    p.message.count
      .mockResolvedValueOnce(4) // messageCount
      .mockResolvedValueOnce(1); // unreadCount

    const res = await svc.adminListThreads(1, 20);

    expect(res.total).toBe(2);
    expect(res.items[0]).toMatchObject({
      threadId: "u1",
      userId: "u1",
      userName: "Alice",
      lastMessage: "latest",
      messageCount: 4,
      unreadCount: 1,
    });
  });
});

describe("contact form", () => {
  it("submitContact persists the message", async () => {
    p.contact.create.mockResolvedValue({
      id: "c1",
      name: "Bob",
      email: "b@x.com",
      phone: null,
      subject: null,
      message: "Hi",
      handled: false,
      createdAt: new Date(),
    });
    const dto = await svc.submitContact({ name: "Bob", email: "b@x.com", message: "Hi" } as never);
    expect(dto.id).toBe("c1");
    expect(p.contact.create.mock.calls[0][0].data).toMatchObject({ name: "Bob", message: "Hi" });
  });

  it("adminSetContactHandled 404s for a missing contact", async () => {
    p.contact.findUnique.mockResolvedValue(null);
    await expect(svc.adminSetContactHandled("gone", true)).rejects.toMatchObject({ status: 404 });
  });
});

import type { Request, Response } from "express";
import {
  contactCreateSchema,
  contactQuerySchema,
  contactUpdateSchema,
  messageCreateSchema,
  notificationCreateSchema,
  notificationQuerySchema,
  paginationQuerySchema,
} from "@nuru/types";
import { sendOk } from "../../lib/response.js";
import { Errors } from "../../lib/errors.js";
import * as svc from "./notifications.service.js";

function param(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw Errors.badRequest("Missing resource identifier.");
  return value;
}

function userId(req: Request): string {
  if (!req.user) throw Errors.unauthorized();
  return req.user.sub;
}

function adminId(req: Request): string {
  if (!req.admin) throw Errors.unauthorized();
  return req.admin.sub;
}

// ---- Notifications: customer ----

export async function listMyNotifications(req: Request, res: Response): Promise<void> {
  const query = notificationQuerySchema.parse(req.query);
  sendOk(res, await svc.listForUser(userId(req), query));
}

export async function myUnreadCount(req: Request, res: Response): Promise<void> {
  sendOk(res, { unreadCount: await svc.unreadCount("USER", userId(req)) });
}

export async function markMyNotificationRead(req: Request, res: Response): Promise<void> {
  sendOk(res, { notification: await svc.markRead("USER", userId(req), param(req, "id")) });
}

export async function markAllMyNotificationsRead(req: Request, res: Response): Promise<void> {
  sendOk(res, { updated: await svc.markAllRead("USER", userId(req)) });
}

// ---- Notifications: admin ----

export async function listAdminNotifications(req: Request, res: Response): Promise<void> {
  const query = notificationQuerySchema.parse(req.query);
  sendOk(res, await svc.listForAdmin(adminId(req), query));
}

export async function adminUnreadCount(req: Request, res: Response): Promise<void> {
  sendOk(res, { unreadCount: await svc.unreadCount("ADMIN", adminId(req)) });
}

export async function markAdminNotificationRead(req: Request, res: Response): Promise<void> {
  sendOk(res, { notification: await svc.markRead("ADMIN", adminId(req), param(req, "id")) });
}

export async function markAllAdminNotificationsRead(req: Request, res: Response): Promise<void> {
  sendOk(res, { updated: await svc.markAllRead("ADMIN", adminId(req)) });
}

export async function createNotification(req: Request, res: Response): Promise<void> {
  const input = notificationCreateSchema.parse(req.body);
  sendOk(res, { notification: await svc.createForUsers(input) }, 201);
}

// ---- Messages: customer ----

export async function listMyMessages(req: Request, res: Response): Promise<void> {
  sendOk(res, { messages: await svc.listMyMessages(userId(req)) });
}

export async function sendMyMessage(req: Request, res: Response): Promise<void> {
  const input = messageCreateSchema.parse(req.body);
  sendOk(res, { message: await svc.sendAsUser(userId(req), input) }, 201);
}

// ---- Messages: admin ----

export async function listThreads(req: Request, res: Response): Promise<void> {
  const { page, pageSize } = paginationQuerySchema.parse(req.query);
  sendOk(res, await svc.adminListThreads(page, pageSize));
}

export async function listThread(req: Request, res: Response): Promise<void> {
  sendOk(res, { messages: await svc.adminListThread(param(req, "threadId")) });
}

export async function replyToThread(req: Request, res: Response): Promise<void> {
  const input = messageCreateSchema.parse(req.body);
  sendOk(res, { message: await svc.adminReply(param(req, "threadId"), adminId(req), input) }, 201);
}

// ---- Contact form ----

export async function submitContact(req: Request, res: Response): Promise<void> {
  const input = contactCreateSchema.parse(req.body);
  sendOk(res, { contact: await svc.submitContact(input) }, 201);
}

export async function listContacts(req: Request, res: Response): Promise<void> {
  const query = contactQuerySchema.parse(req.query);
  sendOk(res, await svc.adminListContacts(query));
}

export async function setContactHandled(req: Request, res: Response): Promise<void> {
  const { handled } = contactUpdateSchema.parse(req.body);
  sendOk(res, { contact: await svc.adminSetContactHandled(param(req, "id"), handled) });
}

import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as ctrl from "./notifications.controller.js";

// ---- Customer notifications: /api/v1/notifications ----
export const notificationsCustomerRouter: Router = Router();
notificationsCustomerRouter.use(requireAuth);
notificationsCustomerRouter.get("/", asyncHandler(ctrl.listMyNotifications));
notificationsCustomerRouter.get("/unread-count", asyncHandler(ctrl.myUnreadCount));
notificationsCustomerRouter.post("/read-all", asyncHandler(ctrl.markAllMyNotificationsRead));
notificationsCustomerRouter.patch("/:id/read", asyncHandler(ctrl.markMyNotificationRead));

// ---- Customer support messages: /api/v1/messages ----
export const messagesCustomerRouter: Router = Router();
messagesCustomerRouter.use(requireAuth);
messagesCustomerRouter.get("/", asyncHandler(ctrl.listMyMessages));
messagesCustomerRouter.post("/", asyncHandler(ctrl.sendMyMessage));

// ---- Public contact form: /api/v1/contact ----
export const contactPublicRouter: Router = Router();
contactPublicRouter.post("/", asyncHandler(ctrl.submitContact));

// ---- Admin notifications: /api/v1/admin/notifications ----
export const notificationsAdminRouter: Router = Router();
notificationsAdminRouter.use(requireAdmin());
notificationsAdminRouter.get("/", asyncHandler(ctrl.listAdminNotifications));
notificationsAdminRouter.get("/unread-count", asyncHandler(ctrl.adminUnreadCount));
notificationsAdminRouter.post("/", asyncHandler(ctrl.createNotification));
notificationsAdminRouter.post("/read-all", asyncHandler(ctrl.markAllAdminNotificationsRead));
notificationsAdminRouter.patch("/:id/read", asyncHandler(ctrl.markAdminNotificationRead));

// ---- Admin support inbox: /api/v1/admin/messages ----
export const messagesAdminRouter: Router = Router();
messagesAdminRouter.use(requireAdmin());
messagesAdminRouter.get("/threads", asyncHandler(ctrl.listThreads));
messagesAdminRouter.get("/threads/:threadId", asyncHandler(ctrl.listThread));
messagesAdminRouter.post("/threads/:threadId", asyncHandler(ctrl.replyToThread));

// ---- Admin contact inbox: /api/v1/admin/contacts ----
export const contactsAdminRouter: Router = Router();
contactsAdminRouter.use(requireAdmin());
contactsAdminRouter.get("/", asyncHandler(ctrl.listContacts));
contactsAdminRouter.patch("/:id", asyncHandler(ctrl.setContactHandled));

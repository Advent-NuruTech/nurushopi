import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requirePickupAgent } from "../../middleware/requirePickupAgent.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import * as controller from "./pickup-agents.controller.js";

export const pickupAgentRouter: Router = Router();
pickupAgentRouter.post("/auth/login", authLimiter, asyncHandler(controller.login));
pickupAgentRouter.post("/auth/logout", controller.logout);
pickupAgentRouter.get("/auth/me", requirePickupAgent(), asyncHandler(controller.me));
pickupAgentRouter.get("/orders", requirePickupAgent(), asyncHandler(controller.stationOrders));
pickupAgentRouter.patch(
  "/orders/:id/status",
  requirePickupAgent(),
  asyncHandler(controller.updateOrderStatus),
);
pickupAgentRouter.post(
  "/orders/:id/pickup-ready-email/retry",
  requirePickupAgent(),
  asyncHandler(controller.retryReadyEmail),
);

export const pickupAgentAdminRouter: Router = Router();
pickupAgentAdminRouter.use(requireAdmin("SENIOR"));
pickupAgentAdminRouter.get("/", asyncHandler(controller.listAgents));
pickupAgentAdminRouter.post("/", asyncHandler(controller.createAgent));
pickupAgentAdminRouter.patch("/:id", asyncHandler(controller.updateAgent));

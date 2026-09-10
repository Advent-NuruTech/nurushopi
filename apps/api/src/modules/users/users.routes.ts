import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import * as ctrl from "./users.controller.js";

// ---- Admin customer management: /api/v1/admin/users ----
export const usersAdminRouter: Router = Router();
usersAdminRouter.get("/", requireAdmin(), asyncHandler(ctrl.list));
usersAdminRouter.get("/:id", requireAdmin(), asyncHandler(ctrl.getOne));
usersAdminRouter.patch(
  "/:id/marketing-email/opt-out",
  requireAdmin("SENIOR"),
  asyncHandler(ctrl.optOutMarketingEmail),
);
usersAdminRouter.delete("/:id", requireAdmin("SENIOR"), asyncHandler(ctrl.remove));

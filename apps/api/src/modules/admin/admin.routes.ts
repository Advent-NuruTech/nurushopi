import { Router } from "express";
import {
  adminInviteSchema,
  adminLoginSchema,
  adminRoleUpdateSchema,
  adminSignupSchema,
} from "@nuru/types";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import * as ctrl from "./admin.controller.js";

/** Admin authentication + management, mounted at /api/v1/admin/auth. */
export const adminAuthRouter: Router = Router();

// Public (credentialled) auth endpoints.
adminAuthRouter.post("/login", authLimiter, validateBody(adminLoginSchema), asyncHandler(ctrl.login));
adminAuthRouter.post("/signup", authLimiter, validateBody(adminSignupSchema), asyncHandler(ctrl.signup));
adminAuthRouter.post("/logout", ctrl.logout);

// Authenticated admin endpoints.
adminAuthRouter.get("/me", requireAdmin(), asyncHandler(ctrl.me));
adminAuthRouter.get("/admins", requireAdmin("SENIOR"), asyncHandler(ctrl.listAdmins));
adminAuthRouter.post(
  "/invite",
  requireAdmin("SENIOR"),
  validateBody(adminInviteSchema),
  asyncHandler(ctrl.invite),
);
adminAuthRouter.patch(
  "/admins/:id/role",
  requireAdmin("SENIOR"),
  validateBody(adminRoleUpdateSchema),
  asyncHandler(ctrl.updateRole),
);
adminAuthRouter.delete("/admins/:id", requireAdmin("SENIOR"), asyncHandler(ctrl.removeAdmin));

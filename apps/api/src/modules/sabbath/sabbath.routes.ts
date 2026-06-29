import { Router } from "express";
import { sabbathMessageCreateSchema, sabbathMessageUpdateSchema } from "@nuru/types";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import * as ctrl from "./sabbath.controller.js";

// ---- Public Sabbath messages: /api/v1/sabbath-messages ----
export const sabbathPublicRouter: Router = Router();
sabbathPublicRouter.get("/", asyncHandler(ctrl.list));

// ---- Admin Sabbath messages: /api/v1/admin/sabbath-messages ----
// Reads are open to any admin; writes are restricted to senior admins.
export const sabbathAdminRouter: Router = Router();
sabbathAdminRouter.get("/", requireAdmin(), asyncHandler(ctrl.adminList));
sabbathAdminRouter.post(
  "/",
  requireAdmin("SENIOR"),
  validateBody(sabbathMessageCreateSchema),
  asyncHandler(ctrl.create),
);
sabbathAdminRouter.put(
  "/:id",
  requireAdmin("SENIOR"),
  validateBody(sabbathMessageUpdateSchema),
  asyncHandler(ctrl.update),
);
sabbathAdminRouter.delete("/:id", requireAdmin("SENIOR"), asyncHandler(ctrl.remove));

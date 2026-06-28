import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as ctrl from "./vendors.controller.js";

/** Public + customer vendor endpoints mounted at /api/v1/vendors. */
export const vendorsPublicRouter: Router = Router();

// Apply works for guests and signed-in users alike (linked when authenticated).
vendorsPublicRouter.post("/apply", optionalAuth, asyncHandler(ctrl.apply));
vendorsPublicRouter.get("/mine", requireAuth, asyncHandler(ctrl.listMine));

/** Admin vendor management mounted at /api/v1/admin/vendors (all guarded). */
export const vendorsAdminRouter: Router = Router();

vendorsAdminRouter.use(requireAdmin());
vendorsAdminRouter.get("/", asyncHandler(ctrl.adminList));
vendorsAdminRouter.get("/:id", asyncHandler(ctrl.adminGet));
vendorsAdminRouter.patch("/:id", asyncHandler(ctrl.moderate));

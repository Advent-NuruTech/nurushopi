import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import * as ctrl from "./dashboard.controller.js";

/** Admin dashboard mounted at /api/v1/admin/dashboard (guarded). */
export const dashboardAdminRouter: Router = Router();

dashboardAdminRouter.use(requireAdmin());

dashboardAdminRouter.get("/", asyncHandler(ctrl.getStats));

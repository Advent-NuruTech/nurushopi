import { Router } from "express";
import { pwaInstallRecordSchema } from "@nuru/types";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import * as ctrl from "./pwa.controller.js";

// ---- Public install recorder: /api/v1/pwa-installs ----
export const pwaPublicRouter: Router = Router();
pwaPublicRouter.post(
  "/",
  optionalAuth,
  validateBody(pwaInstallRecordSchema),
  asyncHandler(ctrl.recordInstall),
);

// ---- Admin install stats: /api/v1/admin/pwa-installs ----
export const pwaAdminRouter: Router = Router();
pwaAdminRouter.use(requireAdmin());
pwaAdminRouter.get("/", asyncHandler(ctrl.stats));

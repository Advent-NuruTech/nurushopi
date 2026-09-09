import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import * as ctrl from "./fulfillment.controller.js";

export const fulfillmentPublicRouter: Router = Router();
fulfillmentPublicRouter.get("/", asyncHandler(ctrl.publicConfiguration));

export const fulfillmentAdminRouter: Router = Router();
fulfillmentAdminRouter.use(requireAdmin());
fulfillmentAdminRouter.get("/configuration", asyncHandler(ctrl.adminConfiguration));
fulfillmentAdminRouter.get("/stations", asyncHandler(ctrl.listStations));
fulfillmentAdminRouter.put(
  "/configuration",
  requireAdmin("SENIOR"),
  asyncHandler(ctrl.updateConfiguration),
);
fulfillmentAdminRouter.post("/stations", requireAdmin("SENIOR"), asyncHandler(ctrl.createStation));
fulfillmentAdminRouter.patch(
  "/stations/:id",
  requireAdmin("SENIOR"),
  asyncHandler(ctrl.updateStation),
);
fulfillmentAdminRouter.delete(
  "/stations/:id",
  requireAdmin("SENIOR"),
  asyncHandler(ctrl.archiveStation),
);

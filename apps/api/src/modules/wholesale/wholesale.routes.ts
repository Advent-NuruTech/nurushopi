import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requireVendor } from "../../middleware/requireVendor.js";
import * as ctrl from "./wholesale.controller.js";

/** Public, read-only wholesale endpoints mounted at /api/v1/wholesale. */
export const wholesalePublicRouter: Router = Router();

wholesalePublicRouter.get("/items", asyncHandler(ctrl.listItems));
wholesalePublicRouter.get("/items/:id", asyncHandler(ctrl.getItem));

/** Admin wholesale management mounted at /api/v1/admin/wholesale (all guarded). */
export const wholesaleAdminRouter: Router = Router();

wholesaleAdminRouter.use(requireAdmin());

wholesaleAdminRouter.get("/items", asyncHandler(ctrl.adminListItems));
wholesaleAdminRouter.get("/items/:id", asyncHandler(ctrl.adminGetItem));
wholesaleAdminRouter.post("/items", asyncHandler(ctrl.createItem));
wholesaleAdminRouter.put("/items/:id", asyncHandler(ctrl.updateItem));
wholesaleAdminRouter.delete("/items/:id", asyncHandler(ctrl.deleteItem));

export const wholesaleVendorRouter: Router = Router();
wholesaleVendorRouter.use(requireVendor());
wholesaleVendorRouter.get("/items", asyncHandler(ctrl.vendorListItems));
wholesaleVendorRouter.get("/items/:id", asyncHandler(ctrl.vendorGetItem));
wholesaleVendorRouter.post("/items", asyncHandler(ctrl.vendorCreateItem));
wholesaleVendorRouter.put("/items/:id", asyncHandler(ctrl.vendorUpdateItem));
wholesaleVendorRouter.delete("/items/:id", asyncHandler(ctrl.vendorDeleteItem));

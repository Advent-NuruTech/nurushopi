import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
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

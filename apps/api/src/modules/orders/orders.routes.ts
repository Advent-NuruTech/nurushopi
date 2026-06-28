import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import * as ctrl from "./orders.controller.js";

/** Customer-facing order endpoints mounted at /api/v1/orders. */
export const ordersCustomerRouter: Router = Router();

// Checkout works for guests and signed-in users alike; optionalAuth links the
// order to a user when a session is present without blocking guests.
ordersCustomerRouter.post("/checkout", optionalAuth, asyncHandler(ctrl.checkout));
// `/mine` must precede `/:orderNumber` so it isn't captured as an order number.
ordersCustomerRouter.get("/mine", requireAuth, asyncHandler(ctrl.getMyOrders));
ordersCustomerRouter.get("/:orderNumber", asyncHandler(ctrl.trackOrder));

/** Admin order management mounted at /api/v1/admin/orders (all guarded). */
export const ordersAdminRouter: Router = Router();

ordersAdminRouter.use(requireAdmin());

ordersAdminRouter.get("/", asyncHandler(ctrl.adminListOrders));
ordersAdminRouter.get("/:id", asyncHandler(ctrl.adminGetOrder));
ordersAdminRouter.patch("/:id/status", asyncHandler(ctrl.updateOrderStatus));
ordersAdminRouter.patch("/:id/payment", asyncHandler(ctrl.updateOrderPayment));

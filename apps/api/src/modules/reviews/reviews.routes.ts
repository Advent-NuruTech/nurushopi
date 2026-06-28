import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as ctrl from "./reviews.controller.js";

/**
 * Public + customer review endpoints mounted at /api/v1/reviews. The public
 * product routes are declared before the auth guard so they stay unauthenticated;
 * everything after `requireAuth` is customer-scoped.
 */
export const reviewsPublicRouter: Router = Router();

reviewsPublicRouter.get("/product/:productId", asyncHandler(ctrl.listForProduct));
reviewsPublicRouter.get("/product/:productId/summary", asyncHandler(ctrl.productSummary));

reviewsPublicRouter.use(requireAuth);
reviewsPublicRouter.get("/mine", asyncHandler(ctrl.listMine));
reviewsPublicRouter.post("/", asyncHandler(ctrl.create));
reviewsPublicRouter.put("/:id", asyncHandler(ctrl.update));
reviewsPublicRouter.delete("/:id", asyncHandler(ctrl.remove));

/** Admin moderation mounted at /api/v1/admin/reviews (all guarded). */
export const reviewsAdminRouter: Router = Router();

reviewsAdminRouter.use(requireAdmin());
reviewsAdminRouter.get("/", asyncHandler(ctrl.adminList));
reviewsAdminRouter.patch("/:id", asyncHandler(ctrl.moderate));
reviewsAdminRouter.delete("/:id", asyncHandler(ctrl.adminRemove));

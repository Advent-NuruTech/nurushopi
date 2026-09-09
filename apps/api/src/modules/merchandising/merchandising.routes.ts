import { Router } from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireVendor } from "../../middleware/requireVendor.js";
import * as ctrl from "./merchandising.controller.js";

const eventLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

/** Public, mobile-compatible merchandising surface. */
export const merchandisingPublicRouter: Router = Router();
merchandisingPublicRouter.get("/homepage", optionalAuth, asyncHandler(ctrl.homepage));
merchandisingPublicRouter.get("/collections", asyncHandler(ctrl.publicCollections));
merchandisingPublicRouter.get(
  "/collections/:idOrKey/products",
  optionalAuth,
  asyncHandler(ctrl.collectionProducts),
);
merchandisingPublicRouter.post("/events", eventLimiter, optionalAuth, asyncHandler(ctrl.events));
merchandisingPublicRouter.post("/bundles/quote", asyncHandler(ctrl.bundleQuote));
merchandisingPublicRouter.get(
  "/retention/preferences",
  requireAuth,
  asyncHandler(ctrl.retentionPreferences),
);
merchandisingPublicRouter.put(
  "/retention/preferences",
  requireAuth,
  asyncHandler(ctrl.saveRetentionPreference),
);
merchandisingPublicRouter.post(
  "/retention/subscriptions",
  requireAuth,
  asyncHandler(ctrl.subscribeRetention),
);
merchandisingPublicRouter.delete(
  "/retention/subscriptions",
  requireAuth,
  asyncHandler(ctrl.unsubscribeRetention),
);

/** Audited control-plane endpoints. Any admin may read; writes require SENIOR. */
export const merchandisingAdminRouter: Router = Router();
merchandisingAdminRouter.use(requireAdmin());
merchandisingAdminRouter.get("/collections", asyncHandler(ctrl.adminCollections));
merchandisingAdminRouter.get("/collections/:id/memberships", asyncHandler(ctrl.adminMemberships));
merchandisingAdminRouter.get(
  "/collections/:id/analytics",
  asyncHandler(ctrl.adminCollectionAnalytics),
);
merchandisingAdminRouter.get("/homepage-sections", asyncHandler(ctrl.adminHomepageSections));

merchandisingAdminRouter.post(
  "/collections",
  requireAdmin("SENIOR"),
  asyncHandler(ctrl.adminCreateCollection),
);
merchandisingAdminRouter.patch(
  "/collections/:id",
  requireAdmin("SENIOR"),
  asyncHandler(ctrl.adminUpdateCollection),
);
merchandisingAdminRouter.put(
  "/collections/:id/memberships",
  requireAdmin("SENIOR"),
  asyncHandler(ctrl.adminUpsertMembership),
);
merchandisingAdminRouter.post(
  "/collections/:id/memberships/import",
  requireAdmin("SENIOR"),
  asyncHandler(ctrl.adminImportMemberships),
);
merchandisingAdminRouter.delete(
  "/collections/:id/memberships/:productId",
  requireAdmin("SENIOR"),
  asyncHandler(ctrl.adminRemoveMembership),
);
merchandisingAdminRouter.post(
  "/collections/:id/overrides",
  requireAdmin("SENIOR"),
  asyncHandler(ctrl.adminCreateOverride),
);
merchandisingAdminRouter.post(
  "/homepage-sections",
  requireAdmin("SENIOR"),
  asyncHandler(ctrl.adminCreateHomepageSection),
);
merchandisingAdminRouter.patch(
  "/homepage-sections/:id",
  requireAdmin("SENIOR"),
  asyncHandler(ctrl.adminUpdateHomepageSection),
);
merchandisingAdminRouter.post(
  "/promotions",
  requireAdmin("SENIOR"),
  asyncHandler(ctrl.adminCreatePromotion),
);

/** Vendor merchandising access: discover collections and manage only owned products. */
export const merchandisingVendorRouter: Router = Router();
merchandisingVendorRouter.use(requireVendor());
merchandisingVendorRouter.get("/collections", asyncHandler(ctrl.vendorCollections));
merchandisingVendorRouter.get("/collections/:id/memberships", asyncHandler(ctrl.vendorMemberships));
merchandisingVendorRouter.post(
  "/collections/:id/memberships/import",
  asyncHandler(ctrl.vendorImportMemberships),
);
merchandisingVendorRouter.delete(
  "/collections/:id/memberships/:productId",
  asyncHandler(ctrl.vendorRemoveMembership),
);

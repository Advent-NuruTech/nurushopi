import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requireVendor } from "../../middleware/requireVendor.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import * as ctrl from "./catalog.controller.js";

/** Public, read-only catalog endpoints mounted at /api/v1/catalog. */
export const catalogPublicRouter: Router = Router();

catalogPublicRouter.get("/products", asyncHandler(ctrl.listProducts));
catalogPublicRouter.get(
  "/products/recommendations",
  optionalAuth,
  asyncHandler(ctrl.recommendProducts),
);
catalogPublicRouter.get("/products/:id", asyncHandler(ctrl.getProduct));
catalogPublicRouter.post("/products/:id/view", optionalAuth, asyncHandler(ctrl.recordProductView));
catalogPublicRouter.get("/categories", asyncHandler(ctrl.listCategories));
catalogPublicRouter.get("/categories/:id", asyncHandler(ctrl.getCategory));
catalogPublicRouter.get("/banners", asyncHandler(ctrl.listBanners));
catalogPublicRouter.get("/hero", asyncHandler(ctrl.listHero));

/** Admin catalog management mounted at /api/v1/admin/catalog (all guarded). */
export const catalogAdminRouter: Router = Router();

catalogAdminRouter.use(requireAdmin());

// Products
catalogAdminRouter.get("/products", asyncHandler(ctrl.adminListProducts));
catalogAdminRouter.get("/products/:id", asyncHandler(ctrl.adminGetProduct));
catalogAdminRouter.post("/products", asyncHandler(ctrl.createProduct));
catalogAdminRouter.post("/products/import", asyncHandler(ctrl.importAdminProducts));
catalogAdminRouter.put("/products/:id", asyncHandler(ctrl.updateProduct));
catalogAdminRouter.delete("/products/:id", asyncHandler(ctrl.deleteProduct));

// Categories
catalogAdminRouter.get("/categories", asyncHandler(ctrl.listCategories));
catalogAdminRouter.post("/categories", asyncHandler(ctrl.createCategory));
catalogAdminRouter.put("/categories/:id", asyncHandler(ctrl.updateCategory));
catalogAdminRouter.delete("/categories/:id", asyncHandler(ctrl.deleteCategory));

// Banners
catalogAdminRouter.get("/banners", asyncHandler(ctrl.adminListBanners));
catalogAdminRouter.post("/banners", asyncHandler(ctrl.createBanner));
catalogAdminRouter.put("/banners/:id", asyncHandler(ctrl.updateBanner));
catalogAdminRouter.delete("/banners/:id", asyncHandler(ctrl.deleteBanner));

// Hero announcements
catalogAdminRouter.get("/hero", asyncHandler(ctrl.adminListHero));
catalogAdminRouter.post("/hero", asyncHandler(ctrl.createHero));
catalogAdminRouter.put("/hero/:id", asyncHandler(ctrl.updateHero));
catalogAdminRouter.delete("/hero/:id", asyncHandler(ctrl.deleteHero));

/** Vendor inventory. Every read and mutation is scoped to the signed-in vendor. */
export const catalogVendorRouter: Router = Router();
catalogVendorRouter.use(requireVendor());
catalogVendorRouter.get("/products", asyncHandler(ctrl.vendorListProducts));
catalogVendorRouter.get("/products/:id", asyncHandler(ctrl.vendorGetProduct));
catalogVendorRouter.post("/products", asyncHandler(ctrl.vendorCreateProduct));
catalogVendorRouter.post("/products/import", asyncHandler(ctrl.importVendorProducts));
catalogVendorRouter.put("/products/:id", asyncHandler(ctrl.vendorUpdateProduct));
catalogVendorRouter.delete("/products/:id", asyncHandler(ctrl.vendorDeleteProduct));

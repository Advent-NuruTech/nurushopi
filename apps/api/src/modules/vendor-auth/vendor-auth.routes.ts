import { Router } from "express";
import { vendorLoginSchema, vendorSignupSchema } from "@nuru/types";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireVendor } from "../../middleware/requireVendor.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import * as ctrl from "./vendor-auth.controller.js";

/** Vendor authentication, mounted at /api/v1/vendor/auth. */
export const vendorAuthRouter: Router = Router();

vendorAuthRouter.post("/login", authLimiter, validateBody(vendorLoginSchema), asyncHandler(ctrl.login));
vendorAuthRouter.post("/signup", authLimiter, validateBody(vendorSignupSchema), asyncHandler(ctrl.signup));
vendorAuthRouter.post("/logout", ctrl.logout);
vendorAuthRouter.get("/me", requireVendor(), asyncHandler(ctrl.me));

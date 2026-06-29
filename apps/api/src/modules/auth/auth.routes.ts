import { Router } from "express";
import {
  forgotPasswordSchema,
  loginSchema,
  profileUpdateSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailSchema,
} from "@nuru/types";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { authLimiter } from "../../middleware/rateLimit.js";
import * as ctrl from "./auth.controller.js";

export const authRouter: Router = Router();

authRouter.post("/signup", authLimiter, validateBody(signupSchema), asyncHandler(ctrl.signup));
authRouter.post("/login", authLimiter, validateBody(loginSchema), asyncHandler(ctrl.login));
authRouter.post("/logout", asyncHandler(ctrl.logout));
authRouter.post("/refresh", asyncHandler(ctrl.refresh));
authRouter.get("/me", requireAuth, asyncHandler(ctrl.me));
authRouter.patch(
  "/me",
  requireAuth,
  validateBody(profileUpdateSchema),
  asyncHandler(ctrl.updateMe),
);

authRouter.post(
  "/verify-email",
  validateBody(verifyEmailSchema),
  asyncHandler(ctrl.verifyEmail),
);
authRouter.post(
  "/forgot-password",
  authLimiter,
  validateBody(forgotPasswordSchema),
  asyncHandler(ctrl.forgotPassword),
);
authRouter.post(
  "/reset-password",
  authLimiter,
  validateBody(resetPasswordSchema),
  asyncHandler(ctrl.resetPassword),
);

// Google OAuth (browser redirects, not JSON)
authRouter.get("/google", ctrl.googleStart);
authRouter.get("/google/callback", asyncHandler(ctrl.googleCallback));

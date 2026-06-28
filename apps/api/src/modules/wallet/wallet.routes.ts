import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as ctrl from "./wallet.controller.js";

/** Customer-facing wallet endpoints mounted at /api/v1/wallet (all require auth). */
export const walletCustomerRouter: Router = Router();

walletCustomerRouter.use(requireAuth);

walletCustomerRouter.get("/", asyncHandler(ctrl.getWallet));
walletCustomerRouter.get("/transactions", asyncHandler(ctrl.listMyTransactions));
walletCustomerRouter.get("/redemptions", asyncHandler(ctrl.listMyRedemptions));
walletCustomerRouter.post("/redemptions", asyncHandler(ctrl.requestRedemption));
walletCustomerRouter.get("/referrals", asyncHandler(ctrl.getReferralSummary));
walletCustomerRouter.post("/referrals/apply", asyncHandler(ctrl.applyReferral));

/** Admin wallet management mounted at /api/v1/admin/wallet (all guarded). */
export const walletAdminRouter: Router = Router();

walletAdminRouter.use(requireAdmin());

walletAdminRouter.get("/transactions", asyncHandler(ctrl.adminListTransactions));
walletAdminRouter.get("/redemptions", asyncHandler(ctrl.adminListRedemptions));
walletAdminRouter.patch("/redemptions/:id", asyncHandler(ctrl.adminUpdateRedemption));
walletAdminRouter.post("/adjustments", asyncHandler(ctrl.adminAdjustBalance));

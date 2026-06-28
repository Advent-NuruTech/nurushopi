import type { Request, Response } from "express";
import {
  applyReferralSchema,
  redemptionQuerySchema,
  redemptionRequestSchema,
  redemptionStatusUpdateSchema,
  walletAdjustmentSchema,
  walletTransactionQuerySchema,
} from "@nuru/types";
import { sendOk } from "../../lib/response.js";
import { Errors } from "../../lib/errors.js";
import * as wallet from "./wallet.service.js";
import * as referral from "./referral.service.js";

/** Read a required route param (guaranteed present by the route pattern). */
function param(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw Errors.badRequest("Missing resource identifier.");
  return value;
}

/** The authenticated user's id, or a 401 if absent. */
function userId(req: Request): string {
  if (!req.user) throw Errors.unauthorized();
  return req.user.sub;
}

// ---- Customer ----

export async function getWallet(req: Request, res: Response): Promise<void> {
  sendOk(res, { wallet: await wallet.getSummary(userId(req)) });
}

export async function listMyTransactions(req: Request, res: Response): Promise<void> {
  const query = walletTransactionQuerySchema.parse(req.query);
  sendOk(res, await wallet.listForUser(userId(req), query));
}

export async function listMyRedemptions(req: Request, res: Response): Promise<void> {
  const query = redemptionQuerySchema.parse(req.query);
  sendOk(res, await wallet.listRedemptionsForUser(userId(req), query));
}

export async function requestRedemption(req: Request, res: Response): Promise<void> {
  const input = redemptionRequestSchema.parse(req.body);
  sendOk(res, { redemption: await wallet.requestRedemption(userId(req), input) }, 201);
}

export async function getReferralSummary(req: Request, res: Response): Promise<void> {
  sendOk(res, { referral: await referral.getSummary(userId(req)) });
}

export async function applyReferral(req: Request, res: Response): Promise<void> {
  const { code } = applyReferralSchema.parse(req.body);
  await referral.applyReferralCode(userId(req), code);
  sendOk(res, { success: true });
}

// ---- Admin ----

export async function adminListTransactions(req: Request, res: Response): Promise<void> {
  const query = walletTransactionQuerySchema.parse(req.query);
  sendOk(res, await wallet.adminListTransactions(query));
}

export async function adminListRedemptions(req: Request, res: Response): Promise<void> {
  const query = redemptionQuerySchema.parse(req.query);
  sendOk(res, await wallet.adminListRedemptions(query));
}

export async function adminUpdateRedemption(req: Request, res: Response): Promise<void> {
  const { status } = redemptionStatusUpdateSchema.parse(req.body);
  sendOk(res, { redemption: await wallet.updateRedemptionStatus(param(req, "id"), status) });
}

export async function adminAdjustBalance(req: Request, res: Response): Promise<void> {
  const input = walletAdjustmentSchema.parse(req.body);
  sendOk(res, { transaction: await wallet.adjustBalance(input) }, 201);
}

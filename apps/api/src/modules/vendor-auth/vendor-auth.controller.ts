import type { Request, Response } from "express";
import type { VendorLoginInput, VendorSignupInput } from "@nuru/types";
import { sendOk } from "../../lib/response.js";
import { Errors } from "../../lib/errors.js";
import * as vendorService from "./vendor-auth.service.js";
import { clearVendorSession, issueVendorSession } from "./vendor-auth.session.js";

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as VendorLoginInput;
  const vendor = await vendorService.login(email, password);
  await issueVendorSession(res, vendor);
  sendOk(res, { vendor: vendorService.toVendorUser(vendor) });
}

export async function signup(req: Request, res: Response): Promise<void> {
  const vendor = await vendorService.signup(req.body as VendorSignupInput);
  await issueVendorSession(res, vendor);
  sendOk(res, { vendor: vendorService.toVendorUser(vendor) }, 201);
}

export function logout(_req: Request, res: Response): void {
  clearVendorSession(res);
  sendOk(res, { success: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.vendor) throw Errors.unauthorized();
  const vendor = await vendorService.getById(req.vendor.sub);
  sendOk(res, { vendor: vendorService.toVendorUser(vendor) });
}

import type { Request, Response } from "express";
import type {
  AdminInviteInput,
  AdminLoginInput,
  AdminRoleUpdateInput,
  AdminSignupInput,
} from "@nuru/types";
import { sendOk } from "../../lib/response.js";
import { Errors } from "../../lib/errors.js";
import * as adminService from "./admin.service.js";
import { clearAdminSession, issueAdminSession } from "./admin.session.js";

function param(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw Errors.badRequest("Missing resource identifier.");
  return value;
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as AdminLoginInput;
  const admin = await adminService.login(email, password);
  await issueAdminSession(res, admin);
  sendOk(res, { admin: adminService.toAdminUser(admin) });
}

export async function signup(req: Request, res: Response): Promise<void> {
  const admin = await adminService.signup(req.body as AdminSignupInput);
  await issueAdminSession(res, admin);
  sendOk(res, { admin: adminService.toAdminUser(admin) }, 201);
}

export function logout(_req: Request, res: Response): void {
  clearAdminSession(res);
  sendOk(res, { success: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.admin) throw Errors.unauthorized();
  const admin = await adminService.getById(req.admin.sub);
  sendOk(res, { admin: adminService.toAdminUser(admin) });
}

export async function invite(req: Request, res: Response): Promise<void> {
  if (!req.admin) throw Errors.unauthorized();
  const created = await adminService.createInvite(req.admin.sub, req.body as AdminInviteInput);
  sendOk(res, { invite: created }, 201);
}

export async function listAdmins(_req: Request, res: Response): Promise<void> {
  sendOk(res, { admins: await adminService.listAdmins() });
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  const { role } = req.body as AdminRoleUpdateInput;
  sendOk(res, { admin: await adminService.updateRole(param(req, "id"), role) });
}

export async function removeAdmin(req: Request, res: Response): Promise<void> {
  if (!req.admin) throw Errors.unauthorized();
  await adminService.removeAdmin(param(req, "id"), req.admin.sub);
  sendOk(res, { success: true });
}

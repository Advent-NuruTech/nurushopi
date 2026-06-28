import type { Request, Response } from "express";
import {
  vendorApplicationCreateSchema,
  vendorApplicationModerateSchema,
  vendorApplicationQuerySchema,
} from "@nuru/types";
import { sendOk } from "../../lib/response.js";
import { Errors } from "../../lib/errors.js";
import * as vendors from "./vendors.service.js";

function param(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw Errors.badRequest("Missing resource identifier.");
  return value;
}

function userId(req: Request): string {
  if (!req.user) throw Errors.unauthorized();
  return req.user.sub;
}

// ---- Public / customer ----

/** Submit an application; links it to the user when one is authenticated. */
export async function apply(req: Request, res: Response): Promise<void> {
  const input = vendorApplicationCreateSchema.parse(req.body);
  sendOk(res, { application: await vendors.apply(input, req.user?.sub) }, 201);
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const query = vendorApplicationQuerySchema.parse(req.query);
  sendOk(res, await vendors.listForUser(userId(req), query));
}

// ---- Admin ----

export async function adminList(req: Request, res: Response): Promise<void> {
  const query = vendorApplicationQuerySchema.parse(req.query);
  sendOk(res, await vendors.adminList(query));
}

export async function adminGet(req: Request, res: Response): Promise<void> {
  sendOk(res, { application: await vendors.adminGetById(param(req, "id")) });
}

export async function moderate(req: Request, res: Response): Promise<void> {
  const input = vendorApplicationModerateSchema.parse(req.body);
  sendOk(res, { application: await vendors.moderate(param(req, "id"), input) });
}

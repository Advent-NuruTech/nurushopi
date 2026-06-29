import type { Request, Response } from "express";
import { adminUserListQuerySchema } from "@nuru/types";
import { sendOk } from "../../lib/response.js";
import { Errors } from "../../lib/errors.js";
import * as usersService from "./users.service.js";

function param(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw Errors.badRequest("Missing resource identifier.");
  return value;
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = adminUserListQuerySchema.parse(req.query);
  sendOk(res, { users: await usersService.list(query) });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  sendOk(res, await usersService.getBundle(param(req, "id")));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await usersService.remove(param(req, "id"));
  sendOk(res, { success: true });
}

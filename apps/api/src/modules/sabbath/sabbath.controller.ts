import type { Request, Response } from "express";
import {
  sabbathMessageAdminQuerySchema,
  sabbathMessageQuerySchema,
  type SabbathMessageCreateInput,
  type SabbathMessageUpdateInput,
} from "@nuru/types";
import { sendOk } from "../../lib/response.js";
import { Errors } from "../../lib/errors.js";
import * as sabbathService from "./sabbath.service.js";

function param(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw Errors.badRequest("Missing resource identifier.");
  return value;
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = sabbathMessageQuerySchema.parse(req.query);
  sendOk(res, await sabbathService.list(query));
}

export async function adminList(req: Request, res: Response): Promise<void> {
  const query = sabbathMessageAdminQuerySchema.parse(req.query);
  sendOk(res, { messages: await sabbathService.adminList(query) });
}

export async function create(req: Request, res: Response): Promise<void> {
  if (!req.admin) throw Errors.unauthorized();
  const message = await sabbathService.create(req.admin.sub, req.body as SabbathMessageCreateInput);
  sendOk(res, { message }, 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const message = await sabbathService.update(param(req, "id"), req.body as SabbathMessageUpdateInput);
  sendOk(res, { message });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await sabbathService.remove(param(req, "id"));
  sendOk(res, { success: true });
}

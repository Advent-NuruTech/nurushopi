import type { Request, Response } from "express";
import {
  wholesaleItemCreateSchema,
  wholesaleItemQuerySchema,
  wholesaleItemUpdateSchema,
} from "@nuru/types";
import { sendOk } from "../../lib/response.js";
import { Errors } from "../../lib/errors.js";
import * as items from "./wholesale.service.js";

/** Read a required route param (guaranteed present by the route pattern). */
function idParam(req: Request): string {
  const id = req.params.id;
  if (!id) throw Errors.badRequest("Missing resource id.");
  return id;
}

// ---- Public reads ----

export async function listItems(req: Request, res: Response): Promise<void> {
  const query = wholesaleItemQuerySchema.parse(req.query);
  sendOk(res, await items.list(query, { enforceActive: true }));
}

export async function getItem(req: Request, res: Response): Promise<void> {
  sendOk(res, { item: await items.getByIdOrSlug(idParam(req), { activeOnly: true }) });
}

// ---- Admin ----

export async function adminListItems(req: Request, res: Response): Promise<void> {
  const query = wholesaleItemQuerySchema.parse(req.query);
  sendOk(res, await items.list(query, { enforceActive: false }));
}

export async function adminGetItem(req: Request, res: Response): Promise<void> {
  sendOk(res, { item: await items.getByIdOrSlug(idParam(req), { activeOnly: false }) });
}

export async function createItem(req: Request, res: Response): Promise<void> {
  const input = wholesaleItemCreateSchema.parse(req.body);
  sendOk(res, { item: await items.create(input) }, 201);
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  const input = wholesaleItemUpdateSchema.parse(req.body);
  sendOk(res, { item: await items.update(idParam(req), input) });
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
  await items.remove(idParam(req));
  sendOk(res, { success: true });
}

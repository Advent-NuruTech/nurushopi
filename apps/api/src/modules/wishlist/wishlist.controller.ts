import type { Request, Response } from "express";
import { wishlistQuerySchema, wishlistUpsertSchema } from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { sendOk } from "../../lib/response.js";
import * as wishlist from "./wishlist.service.js";

function userId(req: Request): string {
  if (!req.user) throw Errors.unauthorized();
  return req.user.sub;
}

function productId(req: Request): string {
  const value = req.params.productId;
  if (!value) throw Errors.badRequest("Missing product id.");
  return value;
}

export async function list(req: Request, res: Response): Promise<void> {
  sendOk(res, await wishlist.list(userId(req), wishlistQuerySchema.parse(req.query)));
}

export async function status(req: Request, res: Response): Promise<void> {
  sendOk(res, { item: await wishlist.getForProduct(userId(req), productId(req)) });
}

export async function save(req: Request, res: Response): Promise<void> {
  const input = wishlistUpsertSchema.parse(req.body);
  sendOk(res, { item: await wishlist.upsert(userId(req), input) }, 201);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await wishlist.remove(userId(req), productId(req));
  sendOk(res, { success: true });
}

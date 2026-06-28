import type { Request, Response } from "express";
import {
  productReviewQuerySchema,
  reviewCreateSchema,
  reviewModerateSchema,
  reviewQuerySchema,
  reviewUpdateSchema,
} from "@nuru/types";
import { sendOk } from "../../lib/response.js";
import { Errors } from "../../lib/errors.js";
import * as reviews from "./reviews.service.js";

function param(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw Errors.badRequest("Missing resource identifier.");
  return value;
}

function userId(req: Request): string {
  if (!req.user) throw Errors.unauthorized();
  return req.user.sub;
}

// ---- Public ----

export async function listForProduct(req: Request, res: Response): Promise<void> {
  const query = productReviewQuerySchema.parse(req.query);
  sendOk(res, await reviews.listForProduct(param(req, "productId"), query));
}

export async function productSummary(req: Request, res: Response): Promise<void> {
  sendOk(res, { summary: await reviews.summaryForProduct(param(req, "productId")) });
}

// ---- Customer ----

export async function listMine(req: Request, res: Response): Promise<void> {
  const query = productReviewQuerySchema.parse(req.query);
  sendOk(res, await reviews.listForUser(userId(req), query));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = reviewCreateSchema.parse(req.body);
  sendOk(res, { review: await reviews.create(userId(req), input) }, 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const input = reviewUpdateSchema.parse(req.body);
  sendOk(res, { review: await reviews.update(userId(req), param(req, "id"), input) });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await reviews.remove(userId(req), param(req, "id"));
  sendOk(res, { success: true });
}

// ---- Admin ----

export async function adminList(req: Request, res: Response): Promise<void> {
  const query = reviewQuerySchema.parse(req.query);
  sendOk(res, await reviews.adminList(query));
}

export async function moderate(req: Request, res: Response): Promise<void> {
  const input = reviewModerateSchema.parse(req.body);
  sendOk(res, { review: await reviews.moderate(param(req, "id"), input) });
}

export async function adminRemove(req: Request, res: Response): Promise<void> {
  await reviews.adminRemove(param(req, "id"));
  sendOk(res, { success: true });
}

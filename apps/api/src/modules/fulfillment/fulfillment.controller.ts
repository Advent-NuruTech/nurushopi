import type { Request, Response } from "express";
import {
  fulfillmentConfigurationUpdateSchema,
  pickupStationCreateSchema,
  pickupStationQuerySchema,
  pickupStationUpdateSchema,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { sendOk } from "../../lib/response.js";
import * as fulfillment from "./fulfillment.service.js";

function param(req: Request, key: string): string {
  const value = req.params[key];
  if (!value) throw Errors.badRequest(`Missing ${key}.`);
  return value;
}

function adminId(req: Request): string {
  if (!req.admin) throw Errors.unauthorized();
  return req.admin.sub;
}

export async function publicConfiguration(_req: Request, res: Response): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  sendOk(res, { fulfillment: await fulfillment.getPublicConfiguration() });
}

export async function adminConfiguration(_req: Request, res: Response): Promise<void> {
  sendOk(res, { configuration: await fulfillment.getAdminConfiguration() });
}

export async function updateConfiguration(req: Request, res: Response): Promise<void> {
  const input = fulfillmentConfigurationUpdateSchema.parse(req.body);
  sendOk(res, {
    configuration: await fulfillment.updateConfiguration(input, adminId(req)),
  });
}

export async function listStations(req: Request, res: Response): Promise<void> {
  sendOk(res, await fulfillment.listStations(pickupStationQuerySchema.parse(req.query)));
}

export async function createStation(req: Request, res: Response): Promise<void> {
  const input = pickupStationCreateSchema.parse(req.body);
  sendOk(res, { station: await fulfillment.createStation(input, adminId(req)) }, 201);
}

export async function updateStation(req: Request, res: Response): Promise<void> {
  const input = pickupStationUpdateSchema.parse(req.body);
  sendOk(res, {
    station: await fulfillment.updateStation(param(req, "id"), input, adminId(req)),
  });
}

export async function archiveStation(req: Request, res: Response): Promise<void> {
  await fulfillment.archiveStation(param(req, "id"), adminId(req));
  sendOk(res, { success: true });
}

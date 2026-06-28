import type { Request, Response } from "express";
import {
  checkoutSchema,
  orderPaymentUpdateSchema,
  orderQuerySchema,
  orderStatusUpdateSchema,
} from "@nuru/types";
import { sendOk } from "../../lib/response.js";
import { Errors } from "../../lib/errors.js";
import * as orders from "./orders.service.js";

/** Read a required route param (guaranteed present by the route pattern). */
function param(req: Request, name: string): string {
  const value = req.params[name];
  if (!value) throw Errors.badRequest("Missing resource identifier.");
  return value;
}

// ---- Customer ----

export async function checkout(req: Request, res: Response): Promise<void> {
  const input = checkoutSchema.parse(req.body);
  sendOk(res, { order: await orders.checkout(input, req.user?.sub) }, 201);
}

export async function getMyOrders(req: Request, res: Response): Promise<void> {
  if (!req.user) throw Errors.unauthorized();
  const query = orderQuerySchema.parse(req.query);
  sendOk(res, await orders.listForUser(req.user.sub, query));
}

export async function trackOrder(req: Request, res: Response): Promise<void> {
  sendOk(res, { order: await orders.getByOrderNumber(param(req, "orderNumber")) });
}

// ---- Admin ----

export async function adminListOrders(req: Request, res: Response): Promise<void> {
  const query = orderQuerySchema.parse(req.query);
  sendOk(res, await orders.adminList(query));
}

export async function adminGetOrder(req: Request, res: Response): Promise<void> {
  sendOk(res, { order: await orders.adminGetById(param(req, "id")) });
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  const { status } = orderStatusUpdateSchema.parse(req.body);
  sendOk(res, { order: await orders.updateStatus(param(req, "id"), status) });
}

export async function updateOrderPayment(req: Request, res: Response): Promise<void> {
  const { paymentStatus } = orderPaymentUpdateSchema.parse(req.body);
  sendOk(res, { order: await orders.updatePayment(param(req, "id"), paymentStatus) });
}

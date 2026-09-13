import type { Request, Response } from "express";
import {
  pickupAgentCreateSchema,
  pickupAgentLoginSchema,
  pickupAgentUpdateSchema,
  pickupOrderQuerySchema,
  pickupOrderStatusUpdateSchema,
} from "@nuru/types";
import { Errors } from "../../lib/errors.js";
import { sendOk } from "../../lib/response.js";
import { clearPickupAgentSession, issuePickupAgentSession } from "./pickup-agents.session.js";
import * as service from "./pickup-agents.service.js";

const param = (req: Request, key: string): string => {
  const value = req.params[key];
  if (!value) throw Errors.badRequest("Missing resource identifier.");
  return value;
};

async function currentAgent(req: Request) {
  if (!req.pickupAgent) throw Errors.unauthorized();
  return service.getById(req.pickupAgent.sub);
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = pickupAgentLoginSchema.parse(req.body);
  const agent = await service.login(input.email, input.password);
  await issuePickupAgentSession(res, agent);
  sendOk(res, { agent: service.toPickupAgentDTO(agent) });
}

export function logout(_req: Request, res: Response): void {
  clearPickupAgentSession(res);
  sendOk(res, { success: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  sendOk(res, { agent: service.toPickupAgentDTO(await currentAgent(req)) });
}

export async function stationOrders(req: Request, res: Response): Promise<void> {
  sendOk(
    res,
    await service.listStationOrders(
      await currentAgent(req),
      pickupOrderQuerySchema.parse(req.query),
    ),
  );
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
  sendOk(res, {
    order: await service.updateStationOrderStatus(
      await currentAgent(req),
      param(req, "id"),
      pickupOrderStatusUpdateSchema.parse(req.body),
    ),
  });
}

export async function retryReadyEmail(req: Request, res: Response): Promise<void> {
  await service.retryReadyEmail(await currentAgent(req), param(req, "id"));
  sendOk(res, { success: true });
}

export async function listAgents(_req: Request, res: Response): Promise<void> {
  sendOk(res, { agents: await service.listAgents() });
}

export async function createAgent(req: Request, res: Response): Promise<void> {
  if (!req.admin) throw Errors.unauthorized();
  sendOk(
    res,
    {
      agent: await service.createAgent(pickupAgentCreateSchema.parse(req.body), req.admin.sub),
    },
    201,
  );
}

export async function updateAgent(req: Request, res: Response): Promise<void> {
  if (!req.admin) throw Errors.unauthorized();
  sendOk(res, {
    agent: await service.updateAgent(
      param(req, "id"),
      pickupAgentUpdateSchema.parse(req.body),
      req.admin.sub,
    ),
  });
}

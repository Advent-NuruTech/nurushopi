import type { Request, Response } from "express";
import { sendOk } from "../../lib/response.js";
import * as dashboard from "./dashboard.service.js";

export async function getStats(_req: Request, res: Response): Promise<void> {
  sendOk(res, { stats: await dashboard.getStats() });
}

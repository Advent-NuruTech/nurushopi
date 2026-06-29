import type { Request, Response } from "express";
import type { PwaInstallRecordInput } from "@nuru/types";
import { sendOk } from "../../lib/response.js";
import * as pwaService from "./pwa.service.js";

export async function recordInstall(req: Request, res: Response): Promise<void> {
  const input = req.body as PwaInstallRecordInput;
  // Fall back to the request's own user agent when the client omits it.
  const userAgent = input.userAgent ?? req.headers["user-agent"] ?? null;
  await pwaService.record(req.user?.sub ?? null, { ...input, userAgent });
  sendOk(res, { success: true }, 201);
}

export async function stats(_req: Request, res: Response): Promise<void> {
  sendOk(res, await pwaService.stats());
}

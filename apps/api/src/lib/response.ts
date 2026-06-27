import type { Response } from "express";
import type { ApiSuccess } from "@nuru/types";

export function sendOk<T>(res: Response, data: T, status = 200): Response {
  const body: ApiSuccess<T> = { ok: true, data };
  return res.status(status).json(body);
}

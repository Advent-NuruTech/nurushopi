import type { RequestHandler } from "express";
import { verifyAccessToken } from "@nuru/auth/tokens";
import { ACCESS_COOKIE } from "@nuru/auth/cookies";
import { Errors } from "../lib/errors.js";
import { env } from "../env.js";

function extractToken(req: Parameters<RequestHandler>[0]): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const cookie = (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];
  return cookie ?? null;
}

/** Requires a valid user access token; populates req.user. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw Errors.unauthorized();
    const claims = await verifyAccessToken(token, env.JWT_ACCESS_SECRET);
    if (!claims) throw Errors.unauthorized("Invalid or expired session");
    req.user = claims;
    next();
  } catch (err) {
    next(err);
  }
};

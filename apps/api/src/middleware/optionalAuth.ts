import type { RequestHandler } from "express";
import { verifyAccessToken } from "@nuru/auth/tokens";
import { ACCESS_COOKIE } from "@nuru/auth/cookies";
import { env } from "../env.js";

/**
 * Attaches req.user when a valid user access token is present, but never
 * rejects. Used for endpoints that work for both guests and signed-in users
 * (e.g. checkout, which links the order to a user when one is authenticated).
 */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
    const cookie = (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];
    const token = bearer ?? cookie ?? null;
    if (token) {
      const claims = await verifyAccessToken(token, env.JWT_ACCESS_SECRET);
      if (claims) req.user = claims;
    }
  } catch {
    // Optional auth: ignore malformed/expired tokens and continue as a guest.
  }
  next();
};

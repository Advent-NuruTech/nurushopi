import type { RequestHandler } from "express";
import { verifyVendorAccessToken } from "@nuru/auth/tokens";
import { VENDOR_ACCESS_COOKIE } from "@nuru/auth/cookies";
import { Errors } from "../lib/errors.js";
import { env } from "../env.js";

/**
 * Requires a valid vendor access token; populates req.vendor.
 */
export function requireVendor(): RequestHandler {
  return async (req, _res, next) => {
    try {
      const header = req.headers.authorization;
      const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
      const cookie = (req.cookies as Record<string, string> | undefined)?.[VENDOR_ACCESS_COOKIE];
      const token = bearer ?? cookie ?? null;
      if (!token) throw Errors.unauthorized();

      const claims = await verifyVendorAccessToken(token, env.JWT_ACCESS_SECRET);
      if (!claims) throw Errors.unauthorized("Invalid or expired vendor session");

      req.vendor = claims;
      next();
    } catch (err) {
      next(err);
    }
  };
}

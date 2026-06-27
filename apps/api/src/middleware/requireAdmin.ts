import type { RequestHandler } from "express";
import { verifyAdminAccessToken } from "@nuru/auth/tokens";
import { ADMIN_ACCESS_COOKIE } from "@nuru/auth/cookies";
import type { AdminRole } from "@nuru/db";
import { Errors } from "../lib/errors.js";
import { env } from "../env.js";

/**
 * Requires a valid admin access token; populates req.admin.
 * Pass a minimum role ("SENIOR") to restrict to senior admins.
 */
export function requireAdmin(minRole?: AdminRole): RequestHandler {
  return async (req, _res, next) => {
    try {
      const header = req.headers.authorization;
      const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
      const cookie = (req.cookies as Record<string, string> | undefined)?.[ADMIN_ACCESS_COOKIE];
      const token = bearer ?? cookie ?? null;
      if (!token) throw Errors.unauthorized();

      const claims = await verifyAdminAccessToken(token, env.JWT_ACCESS_SECRET);
      if (!claims) throw Errors.unauthorized("Invalid or expired admin session");

      if (minRole === "SENIOR" && claims.role !== "SENIOR") {
        throw Errors.forbidden("Senior admin access required");
      }

      req.admin = claims;
      next();
    } catch (err) {
      next(err);
    }
  };
}

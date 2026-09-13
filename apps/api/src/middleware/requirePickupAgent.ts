import type { RequestHandler } from "express";
import { verifyPickupAgentAccessToken } from "@nuru/auth/tokens";
import { PICKUP_AGENT_ACCESS_COOKIE } from "@nuru/auth/cookies";
import { Errors } from "../lib/errors.js";
import { env } from "../env.js";

export function requirePickupAgent(): RequestHandler {
  return async (req, _res, next) => {
    try {
      const header = req.headers.authorization;
      const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
      const cookie = (req.cookies as Record<string, string> | undefined)?.[
        PICKUP_AGENT_ACCESS_COOKIE
      ];
      const token = bearer ?? cookie ?? null;
      if (!token) throw Errors.unauthorized();
      const claims = await verifyPickupAgentAccessToken(token, env.JWT_ACCESS_SECRET);
      if (!claims) throw Errors.unauthorized("Invalid or expired pickup agent session");
      req.pickupAgent = claims;
      next();
    } catch (error) {
      next(error);
    }
  };
}

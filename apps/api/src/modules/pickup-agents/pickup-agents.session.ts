import type { Response } from "express";
import type { PickupAgent } from "@nuru/db";
import { signPickupAgentAccessToken } from "@nuru/auth/tokens";
import { PICKUP_AGENT_ACCESS_COOKIE, buildCookieOptions } from "@nuru/auth/cookies";
import { env, isProd } from "../../env.js";

const SESSION_TTL = 8 * 60 * 60;

export async function issuePickupAgentSession(res: Response, agent: PickupAgent): Promise<void> {
  const token = await signPickupAgentAccessToken(
    { sub: agent.id, email: agent.email, stationId: agent.stationId },
    { secret: env.JWT_ACCESS_SECRET, ttlSeconds: SESSION_TTL },
  );
  res.cookie(
    PICKUP_AGENT_ACCESS_COOKIE,
    token,
    buildCookieOptions({
      maxAgeSeconds: SESSION_TTL,
      isProd,
      domain: env.COOKIE_DOMAIN || undefined,
    }),
  );
}

export function clearPickupAgentSession(res: Response): void {
  res.clearCookie(PICKUP_AGENT_ACCESS_COOKIE, {
    path: "/",
    domain: env.COOKIE_DOMAIN || undefined,
  });
}

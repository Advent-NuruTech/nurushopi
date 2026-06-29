import type { Response } from "express";
import { signAdminAccessToken } from "@nuru/auth/tokens";
import { ADMIN_ACCESS_COOKIE, buildCookieOptions } from "@nuru/auth/cookies";
import type { Admin } from "@nuru/db";
import { env, isProd } from "../../env.js";

/**
 * Admin sessions are a single short-lived access cookie (no refresh rotation —
 * admins re-authenticate on expiry). 8 hours covers a working day.
 */
export const ADMIN_SESSION_TTL = 8 * 60 * 60; // seconds

export async function issueAdminSession(res: Response, admin: Admin): Promise<void> {
  const token = await signAdminAccessToken(
    { sub: admin.id, email: admin.email, role: admin.role },
    { secret: env.JWT_ACCESS_SECRET, ttlSeconds: ADMIN_SESSION_TTL },
  );
  const domain = env.COOKIE_DOMAIN || undefined;
  res.cookie(
    ADMIN_ACCESS_COOKIE,
    token,
    buildCookieOptions({ maxAgeSeconds: ADMIN_SESSION_TTL, isProd, domain }),
  );
}

export function clearAdminSession(res: Response): void {
  const domain = env.COOKIE_DOMAIN || undefined;
  res.clearCookie(ADMIN_ACCESS_COOKIE, { path: "/", domain });
}

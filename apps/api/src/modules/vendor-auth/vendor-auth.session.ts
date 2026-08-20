import type { Response } from "express";
import { signVendorAccessToken } from "@nuru/auth/tokens";
import { VENDOR_ACCESS_COOKIE, buildCookieOptions } from "@nuru/auth/cookies";
import type { VendorAccount } from "@nuru/db";
import { env, isProd } from "../../env.js";

/** Vendor sessions: 8-hour access cookie, same as admin. */
export const VENDOR_SESSION_TTL = 8 * 60 * 60; // seconds

export async function issueVendorSession(res: Response, vendor: VendorAccount): Promise<void> {
  const token = await signVendorAccessToken(
    { sub: vendor.id, email: vendor.email },
    { secret: env.JWT_ACCESS_SECRET, ttlSeconds: VENDOR_SESSION_TTL },
  );
  const domain = env.COOKIE_DOMAIN || undefined;
  res.cookie(
    VENDOR_ACCESS_COOKIE,
    token,
    buildCookieOptions({ maxAgeSeconds: VENDOR_SESSION_TTL, isProd, domain }),
  );
}

export function clearVendorSession(res: Response): void {
  const domain = env.COOKIE_DOMAIN || undefined;
  res.clearCookie(VENDOR_ACCESS_COOKIE, { path: "/", domain });
}

import type { Request, Response } from "express";
import { prisma } from "@nuru/db";
import { signAccessToken } from "@nuru/auth/tokens";
import { generateOpaqueToken, hashToken } from "@nuru/auth/crypto";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  buildCookieOptions,
} from "@nuru/auth/cookies";
import { env, isProd } from "../../env.js";
import { Errors } from "../../lib/errors.js";

/**
 * Issues a new access cookie + a fresh refresh token (persisted hashed) and
 * sets both as httpOnly cookies. `familyId` ties a rotation chain together.
 */
export async function issueSession(
  res: Response,
  req: Request,
  user: { id: string; email: string },
  familyId?: string,
): Promise<void> {
  const accessToken = await signAccessToken(
    { sub: user.id, email: user.email },
    { secret: env.JWT_ACCESS_SECRET, ttlSeconds: env.ACCESS_TOKEN_TTL },
  );

  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      familyId: familyId ?? generateOpaqueToken(16),
      expiresAt,
      userAgent: req.get("user-agent") ?? null,
      ip: req.ip ?? null,
    },
  });

  const domain = env.COOKIE_DOMAIN || undefined;
  res.cookie(
    ACCESS_COOKIE,
    accessToken,
    buildCookieOptions({ maxAgeSeconds: env.ACCESS_TOKEN_TTL, isProd, domain }),
  );
  res.cookie(
    REFRESH_COOKIE,
    refreshToken,
    buildCookieOptions({ maxAgeSeconds: env.REFRESH_TOKEN_TTL, isProd, domain }),
  );
}

/**
 * Rotates a refresh token: validates the presented token, revokes it, and
 * issues a new session in the same family. Reuse of an already-revoked token
 * revokes the entire family (theft detection).
 */
export async function rotateSession(res: Response, req: Request): Promise<void> {
  const presented = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  if (!presented) throw Errors.unauthorized("Missing refresh token");

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(presented) },
  });

  if (!record) throw Errors.unauthorized("Invalid refresh token");

  // Reuse of a revoked or expired token → nuke the family.
  if (record.revokedAt || record.expiresAt < new Date()) {
    await prisma.refreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw Errors.unauthorized("Refresh token reuse detected");
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user || !user.isActive) throw Errors.unauthorized("Account unavailable");

  await issueSession(res, req, { id: user.id, email: user.email }, record.familyId);
}

/** Clears auth cookies and revokes the presented refresh token. */
export async function clearSession(res: Response, req: Request): Promise<void> {
  const presented = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  if (presented) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(presented), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  const domain = env.COOKIE_DOMAIN || undefined;
  res.clearCookie(ACCESS_COOKIE, { path: "/", domain });
  res.clearCookie(REFRESH_COOKIE, { path: "/", domain });
}

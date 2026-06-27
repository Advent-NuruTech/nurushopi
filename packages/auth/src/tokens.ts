// Edge-safe JWT helpers (jose only — no Node built-ins).
// Safe to import from Next.js middleware (Edge runtime).
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { AccessTokenClaims, AdminAccessTokenClaims } from "@nuru/types";

const encoder = new TextEncoder();

function secretKey(secret: string): Uint8Array {
  return encoder.encode(secret);
}

export interface SignOptions {
  secret: string;
  ttlSeconds: number;
}

export async function signAccessToken(
  claims: Omit<AccessTokenClaims, "type">,
  opts: SignOptions,
): Promise<string> {
  return new SignJWT({ ...claims, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${opts.ttlSeconds}s`)
    .sign(secretKey(opts.secret));
}

export async function verifyAccessToken(
  token: string,
  secret: string,
): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    if ((payload as JWTPayload & { type?: string }).type !== "access") return null;
    return payload as unknown as AccessTokenClaims;
  } catch {
    return null;
  }
}

export async function signAdminAccessToken(
  claims: Omit<AdminAccessTokenClaims, "type">,
  opts: SignOptions,
): Promise<string> {
  return new SignJWT({ ...claims, type: "admin_access" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${opts.ttlSeconds}s`)
    .sign(secretKey(opts.secret));
}

export async function verifyAdminAccessToken(
  token: string,
  secret: string,
): Promise<AdminAccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    if ((payload as JWTPayload & { type?: string }).type !== "admin_access") return null;
    return payload as unknown as AdminAccessTokenClaims;
  } catch {
    return null;
  }
}

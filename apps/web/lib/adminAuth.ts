import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "nurushop-admin-secret-change-in-production"
);
const COOKIE_NAME = "admin_token";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type AdminRole = "senior" | "sub";

export interface AdminPayload {
  adminId: string;
  email: string;
  name: string;
  role: AdminRole;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: AdminPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminPayload;
  } catch {
    return null;
  }
}

/** For use in Route Handlers: get token from cookie or Authorization header */
export async function getAdminFromRequest(request: Request): Promise<AdminPayload | null> {
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const cookieHeader = request.headers.get("cookie");
  const match = cookieHeader?.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = bearer ?? match?.[1] ?? null;
  if (!token) return null;
  return verifyToken(token);
}

export function getAdminTokenCookieName(): string {
  return COOKIE_NAME;
}

export function getAdminTokenMaxAge(): number {
  return TOKEN_MAX_AGE;
}

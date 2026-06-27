// Shared cookie names + factory for auth cookie options. Framework-free.
export const ACCESS_COOKIE = "nuru_access";
export const REFRESH_COOKIE = "nuru_refresh";
export const ADMIN_ACCESS_COOKIE = "nuru_admin_access";

export interface CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number; // milliseconds (Express res.cookie expects ms)
  domain?: string;
}

export function buildCookieOptions(params: {
  maxAgeSeconds: number;
  isProd: boolean;
  domain?: string;
}): CookieOptions {
  return {
    httpOnly: true,
    secure: params.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: params.maxAgeSeconds * 1000,
    ...(params.domain ? { domain: params.domain } : {}),
  };
}

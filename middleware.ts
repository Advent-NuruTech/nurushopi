import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PUBLIC = ["/admin/login", "/admin/signup"];
const ADMIN_COOKIE = "admin_token";

const SENIOR_ONLY_TABS = new Set([
  "invite",
  "admins",
  "categories",
  "hero",
  "vendorApplications",
  "wholesale",
  "reviews",
  "redemptions",
  "users",
  "banners",
  "contacts",
]);

const SENIOR_ONLY_PATH_PREFIXES = ["/admin/dashboard/vendors", "/admin/dashboard/users"];

/**
 * Safely decode JWT payload without verification.
 * This only reads the token claims but does not trust the signature.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Payload = token.split(".")[1];
    if (!base64Payload) return null;
    const normalized = base64Payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getRoleFromToken(token: string): "senior" | "sub" | null {
  const payload = decodeJwtPayload(token);
  const role = payload?.role;
  if (role === "senior" || role === "sub") return role;
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  if (ADMIN_PUBLIC.some((path) => pathname === path || pathname.startsWith(path + "?"))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!token && (pathname === "/admin" || pathname === "/admin/" || pathname.startsWith("/admin/dashboard"))) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!token) {
    return NextResponse.next();
  }

  const role = getRoleFromToken(token);
  if (!role) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (role !== "senior") {
    if (pathname === "/admin/dashboard") {
      const tab = searchParams.get("tab");
      if (tab && SENIOR_ONLY_TABS.has(tab)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.searchParams.set("tab", "overview");
        return NextResponse.redirect(redirectUrl);
      }
    }

    if (SENIOR_ONLY_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      const redirectUrl = new URL("/admin/dashboard?tab=overview", request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

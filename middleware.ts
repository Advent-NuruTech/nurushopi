import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PUBLIC = ["/admin/login", "/admin/signup"];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/admin")) return NextResponse.next();
  if (ADMIN_PUBLIC.some((p) => path === p || path.startsWith(p + "?"))) return NextResponse.next();

  const token = request.cookies.get("admin_token")?.value;
  if (!token && (path === "/admin" || path === "/admin/" || path.startsWith("/admin/dashboard"))) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("from", path);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};



















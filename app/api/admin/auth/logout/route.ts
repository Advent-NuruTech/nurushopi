import { NextResponse } from "next/server";
import { getAdminTokenCookieName } from "@/lib/adminAuth";

export async function POST() {
  const cookieName = getAdminTokenCookieName();
  const res = NextResponse.json({ success: true });
  res.headers.set(
    "Set-Cookie",
    `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return res;
}

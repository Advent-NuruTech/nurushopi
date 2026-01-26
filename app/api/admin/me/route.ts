import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    admin: {
      adminId: admin.adminId,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  });
}

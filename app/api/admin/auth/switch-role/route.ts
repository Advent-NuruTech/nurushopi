import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  createToken,
  getAdminFromRequest,
  getAdminTokenCookieName,
  getAdminTokenMaxAge,
  type AdminRole,
} from "@/lib/adminAuth";

type SwitchRoleBody = {
  targetRole?: AdminRole;
};

export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as SwitchRoleBody;
    const targetRole = body.targetRole;

    if (targetRole !== "senior" && targetRole !== "sub") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (targetRole === admin.role) {
      return NextResponse.json({ success: true });
    }

    const email = String(admin.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Invalid account email" }, { status: 400 });
    }

    const adminsSnap = await getDocs(
      query(
        collection(db, "admins"),
        where("email", "==", email),
        where("role", "==", targetRole)
      )
    );

    if (adminsSnap.empty) {
      return NextResponse.json({ error: "Target role account not found" }, { status: 404 });
    }

    const target = adminsSnap.docs[0];
    const targetData = target.data() as Record<string, unknown>;
    const token = await createToken({
      adminId: target.id,
      email,
      name: String(targetData.name ?? admin.name ?? ""),
      role: targetRole,
    });

    const cookieName = getAdminTokenCookieName();
    const maxAge = getAdminTokenMaxAge();

    const response = NextResponse.json({
      success: true,
      admin: {
        adminId: target.id,
        email,
        name: String(targetData.name ?? admin.name ?? ""),
        role: targetRole,
      },
    });
    response.headers.set(
      "Set-Cookie",
      `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
        process.env.NODE_ENV === "production" ? "; Secure" : ""
      }`
    );

    return response;
  } catch (error) {
    console.error("Admin switch-role error:", error);
    return NextResponse.json({ error: "Failed to switch role" }, { status: 500 });
  }
}

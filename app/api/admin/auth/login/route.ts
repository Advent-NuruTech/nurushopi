import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  verifyPassword,
  createToken,
  getAdminTokenCookieName,
  getAdminTokenMaxAge,
  type AdminRole,
} from "@/lib/adminAuth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const adminsRef = collection(db, "admins");
    const q = query(adminsRef, where("email", "==", String(email).trim().toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const doc = snap.docs[0];
    const data = doc.data();
    const passwordHash = data.passwordHash as string | undefined;
    if (!passwordHash || !(await verifyPassword(password, passwordHash))) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const adminId = doc.id;
    const name = (data.name as string) ?? "";
    const role = (data.role as AdminRole) ?? "sub";

    const token = await createToken({
      adminId,
      email: data.email as string,
      name,
      role,
    });

    const cookieName = getAdminTokenCookieName();
    const maxAge = getAdminTokenMaxAge();
    const res = NextResponse.json({
      success: true,
      admin: { adminId, email: data.email, name, role },
    });
    res.headers.set(
      "Set-Cookie",
      `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
    );
    return res;
  } catch (e) {
    console.error("Admin login error:", e);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

interface TimestampLike {
  toMillis?: () => number;
}
import { hashPassword, createToken, getAdminTokenCookieName, getAdminTokenMaxAge } from "@/lib/adminAuth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      inviteToken,
    } = body as {
      name?: string;
      email?: string;
      password?: string;
      inviteToken?: string;
    };

    const trimmedEmail = String(email ?? "").trim().toLowerCase();
    if (!trimmedEmail || !password || !name) {
      return NextResponse.json(
        { error: "Name, email and password required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const adminsRef = collection(db, "admins");
    const existing = query(adminsRef, where("email", "==", trimmedEmail));
    const existingSnap = await getDocs(existing);
    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: "An admin with this email already exists" },
        { status: 400 }
      );
    }

    let role: "senior" | "sub" = "sub";
    const allAdmins = await getDocs(adminsRef);

    if (allAdmins.empty) {
      role = "senior";
    } else {
      if (!inviteToken) {
        return NextResponse.json(
          { error: "Invite token required. Use the link shared by a Senior Admin." },
          { status: 400 }
        );
      }
      const inviteDoc = doc(db, "admin_invites", String(inviteToken).trim());
      const inviteSnap = await getDoc(inviteDoc);
      if (!inviteSnap.exists()) {
        return NextResponse.json(
          { error: "Invalid or expired invite token" },
          { status: 400 }
        );
      }
      const inv = inviteSnap.data();
      const exp = inv?.expiresAt as TimestampLike | Date | undefined;
      const expMs = exp && typeof (exp as TimestampLike).toMillis === "function"
        ? (exp as TimestampLike).toMillis!()
        : exp ? new Date(exp as Date).getTime() : 0;
      if (expMs && Date.now() > expMs) {
        return NextResponse.json(
          { error: "Invite token has expired" },
          { status: 400 }
        );
      }
      role = "sub";
    }

    const passwordHash = await hashPassword(password);
    const newAdmin = await addDoc(adminsRef, {
      name: String(name).trim(),
      email: trimmedEmail,
      passwordHash,
      role,
      assignedProducts: [],
      createdAt: serverTimestamp(),
    });

    const token = await createToken({
      adminId: newAdmin.id,
      email: trimmedEmail,
      name: String(name).trim(),
      role,
    });

    const cookieName = getAdminTokenCookieName();
    const maxAge = getAdminTokenMaxAge();
    const res = NextResponse.json({
      success: true,
      admin: {
        adminId: newAdmin.id,
        email: trimmedEmail,
        name: String(name).trim(),
        role,
      },
    });
    res.headers.set(
      "Set-Cookie",
      `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
    );
    return res;
  } catch (e) {
    console.error("Admin signup error:", e);
    return NextResponse.json(
      { error: "Signup failed" },
      { status: 500 }
    );
  }
}

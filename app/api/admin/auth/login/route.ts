import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
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

    const matching = await Promise.all(
      snap.docs.map(async (adminDoc) => {
        const data = adminDoc.data();
        const passwordHash = data.passwordHash as string | undefined;
        if (!passwordHash) return null;
        const valid = await verifyPassword(password, passwordHash);
        if (!valid) return null;
        const role = (data.role as AdminRole) ?? "sub";
        return {
          adminDoc,
          data,
          role,
          passwordHash,
        };
      })
    );

    const validMatches = matching.filter(
      (
        item
      ): item is {
        adminDoc: typeof snap.docs[number];
        data: Record<string, unknown>;
        role: AdminRole;
        passwordHash: string;
      } => Boolean(item)
    );

    if (!validMatches.length) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    validMatches.sort((a, b) => {
      const weight = (value: AdminRole) => (value === "sub" ? 0 : 1);
      return weight(a.role) - weight(b.role);
    });

    const selected = validMatches[0];
    const adminId = selected.adminDoc.id;
    const name = (selected.data.name as string) ?? "";
    const role = selected.role;

    if (snap.docs.length > 1) {
      await Promise.all(
        snap.docs.map(async (adminDoc) => {
          const currentHash = adminDoc.data().passwordHash as string | undefined;
          if (!currentHash || currentHash === selected.passwordHash) return;
          await updateDoc(doc(db, "admins", adminDoc.id), {
            passwordHash: selected.passwordHash,
            updatedAt: serverTimestamp(),
          });
        })
      );
    }

    const token = await createToken({
      adminId,
      email: selected.data.email as string,
      name,
      role,
    });

    const cookieName = getAdminTokenCookieName();
    const maxAge = getAdminTokenMaxAge();
    const res = NextResponse.json({
      success: true,
      admin: { adminId, email: selected.data.email, name, role },
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

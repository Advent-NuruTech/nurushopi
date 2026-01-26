import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

function randomToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let t = "";
  for (let i = 0; i < 32; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (admin.role !== "senior") {
    return NextResponse.json(
      { error: "Only Senior Admin can invite other admins" },
      { status: 403 }
    );
  }

  try {
    const token = randomToken();
    await setDoc(doc(db, "admin_invites", token), {
      createdBy: admin.adminId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: serverTimestamp(),
    });

    const base =
      typeof process.env.NEXT_PUBLIC_APP_URL === "string"
        ? process.env.NEXT_PUBLIC_APP_URL
        : request.url.replace(/\/api\/admin\/auth\/invite.*$/, "");
    const link = `${base}/admin/signup?invite=${token}`;

    return NextResponse.json({ success: true, link, token });
  } catch (e) {
    console.error("Admin invite error:", e);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}

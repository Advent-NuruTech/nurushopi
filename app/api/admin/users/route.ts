import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snap = await getDocs(collection(db, "users"));
    const users = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        name: (data.fullName as string) || (data.name as string) || (data.email as string) || "User",
        email: (data.email as string) || "",
        phone: (data.phone as string) || "",
      };
    });
    return NextResponse.json({ users });
  } catch (e) {
    console.error("Admin users list error:", e);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

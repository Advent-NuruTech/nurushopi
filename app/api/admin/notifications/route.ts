import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  where,
} from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snap = await getDocs(
      query(
        collection(db, "notifications"),
        where("recipientType", "==", "admin"),
        where("recipientId", "==", admin.adminId),
        orderBy("createdAt", "desc")
      )
    );
    const notifications = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
    return NextResponse.json({ notifications });
  } catch (e) {
    console.error("Admin notifications list error:", e);
    return NextResponse.json({ error: "Failed to list notifications" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { id?: string; ids?: string[] };
    const ids = body.ids ?? (body.id ? [body.id] : []);
    if (!ids.length) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await Promise.all(
      ids.map((id) =>
        updateDoc(doc(db, "notifications", id), { readAt: serverTimestamp() })
      )
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin notifications update error:", e);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}

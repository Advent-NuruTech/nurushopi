import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

function toDateStr(t: unknown): string {
  if (!t) return new Date().toISOString();
  if (typeof (t as { toDate?: () => Date }).toDate === "function") {
    return (t as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof t === "string") return t;
  if (typeof t === "number") return new Date(t).toISOString();
  return new Date().toISOString();
}

/** GET: list all contact messages */
export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const coll = collection(db, "contacts");
    const q = query(coll, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const contacts = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        message: data.message ?? "",
        read: !!data.read,
        createdAt: toDateStr(data.createdAt),
      };
    });
    return NextResponse.json({ contacts });
  } catch (e) {
    console.error("Admin contacts list error:", e);
    return NextResponse.json({ error: "Failed to list contacts" }, { status: 500 });
  }
}

/** PUT: mark as read/unread. Body: { id, read: boolean } */
export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, read } = body as { id?: string; read?: boolean };
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const ref = doc(db, "contacts", id);
    await updateDoc(ref, {
      read: !!read,
      updatedAt: serverTimestamp(),
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin contact update error:", e);
    return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
  }
}

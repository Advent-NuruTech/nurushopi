import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, deleteDoc, query, where } from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

/** GET: list all admins (senior only) */
export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const snap = admin.role === "senior"
      ? await getDocs(collection(db, "admins"))
      : await getDocs(query(collection(db, "admins"), where("role", "==", "senior")));
    const admins = snap.docs.map((d) => {
      const data = d.data();
      return {
        adminId: d.id,
        name: data.name ?? "",
        email: data.email ?? "",
        role: data.role ?? "sub",
        createdAt: data.createdAt,
      };
    });
    return NextResponse.json({ admins, total: admins.length });
  } catch (e) {
    console.error("Admin list error:", e);
    return NextResponse.json({ error: "Failed to list admins" }, { status: 500 });
  }
}

/** DELETE: remove an admin (senior only, cannot delete self) */
export async function DELETE(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const targetId = url.searchParams.get("adminId");
    if (!targetId) {
      return NextResponse.json({ error: "adminId required" }, { status: 400 });
    }
    if (targetId === admin.adminId) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    await deleteDoc(doc(db, "admins", targetId));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin delete error:", e);
    return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 });
  }
}

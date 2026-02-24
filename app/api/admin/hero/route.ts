import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/adminLogs";
import { HERO_DEFAULT_GRADIENT, resolveHeroGradient } from "@/lib/heroGradients";

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const snap = await getDocs(
      query(collection(db, "hero_announcements"), orderBy("order", "asc"))
    );
    const items = snap.docs.map((docSnap, index) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        text: String(data.text ?? ""),
        gradient: resolveHeroGradient(
          String(data.gradient ?? "").trim() || HERO_DEFAULT_GRADIENT
        ),
        order:
          typeof data.order === "number" && Number.isFinite(data.order)
            ? data.order
            : index,
        isActive: Boolean(data.isActive ?? true),
      };
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Admin hero GET error:", error);
    return NextResponse.json({ error: "Failed to load hero items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      text?: string;
      gradient?: string;
      order?: number;
      isActive?: boolean;
    };

    const text = String(body.text ?? "").trim();
    const gradient = resolveHeroGradient(
      String(body.gradient ?? "").trim() || HERO_DEFAULT_GRADIENT
    );
    if (!text || !gradient) {
      return NextResponse.json({ error: "text and gradient are required" }, { status: 400 });
    }

    const snap = await getDocs(collection(db, "hero_announcements"));
    const nextOrder =
      typeof body.order === "number" && Number.isFinite(body.order)
        ? body.order
        : snap.size;

    const ref = await addDoc(collection(db, "hero_announcements"), {
      text,
      gradient,
      order: nextOrder,
      isActive: body.isActive !== false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await logAdminAction({
      adminId: admin.adminId,
      action: "hero_create",
      targetType: "hero_announcement",
      targetId: ref.id,
    });

    return NextResponse.json({ success: true, id: ref.id });
  } catch (error) {
    console.error("Admin hero POST error:", error);
    return NextResponse.json({ error: "Failed to create hero item" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      id?: string;
      text?: string;
      gradient?: string;
      order?: number;
      isActive?: boolean;
    };

    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const ref = doc(db, "hero_announcements", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (body.text !== undefined) updates.text = String(body.text).trim();
    if (body.gradient !== undefined) {
      updates.gradient = resolveHeroGradient(String(body.gradient).trim());
    }
    if (body.order !== undefined && Number.isFinite(body.order)) updates.order = Number(body.order);
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    await updateDoc(ref, updates);
    await logAdminAction({
      adminId: admin.adminId,
      action: "hero_update",
      targetType: "hero_announcement",
      targetId: id,
      metadata: { fields: Object.keys(updates) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin hero PUT error:", error);
    return NextResponse.json({ error: "Failed to update hero item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const ref = doc(db, "hero_announcements", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    await deleteDoc(ref);
    await logAdminAction({
      adminId: admin.adminId,
      action: "hero_delete",
      targetType: "hero_announcement",
      targetId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin hero DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete hero item" }, { status: 500 });
  }
}

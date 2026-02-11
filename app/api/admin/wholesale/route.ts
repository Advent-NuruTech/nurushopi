import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/adminLogs";
import path from "path";
import { unlink } from "fs/promises";

const deleteLocalFile = async (url: string) => {
  if (!url.startsWith("/uploads/wholesale/")) return;
  const sanitized = url.replace(/^\/+/, "");
  const filePath = path.join(process.cwd(), "public", sanitized);
  try {
    await unlink(filePath);
  } catch {
    // ignore missing files
  }
};

/* ---------- GET: list wholesale products ---------- */
export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const coll = collection(db, "products");
    const q =
      admin.role === "senior"
        ? query(coll, where("mode", "==", "wholesale"), orderBy("createdAt", "desc"))
        : query(
            coll,
            where("mode", "==", "wholesale"),
            where("createdBy", "==", admin.adminId),
            orderBy("createdAt", "desc")
          );

    const snap = await getDocs(q);
    const items = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name ?? "",
        description: data.description ?? "",
        category: data.category ?? "",
        price: data.price ?? null,
        wholesalePrice: data.wholesalePrice ?? 0,
        wholesaleMinQty: data.wholesaleMinQty ?? null,
        wholesaleUnit: data.wholesaleUnit ?? "",
        images: data.images ?? [],
        coverImage: data.coverImage ?? null,
        createdBy: data.createdBy ?? null,
        createdAt: data.createdAt ?? null,
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error("Admin wholesale list error:", e);
    return NextResponse.json({ error: "Failed to list wholesale products" }, { status: 500 });
  }
}

/* ---------- PUT: update wholesale product ---------- */
export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      id,
      name,
      description,
      category,
      price,
      wholesalePrice,
      wholesaleMinQty,
      wholesaleUnit,
      images,
    } = body as {
      id?: string;
      name?: string;
      description?: string;
      category?: string;
      price?: number;
      wholesalePrice?: number;
      wholesaleMinQty?: number;
      wholesaleUnit?: string;
      images?: string[];
    };

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const ref = doc(db, "products", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const data = snap.data();
    if (data.mode !== "wholesale") {
      return NextResponse.json({ error: "Not a wholesale product" }, { status: 400 });
    }
    if (admin.role === "sub" && data.createdBy !== admin.adminId) {
      return NextResponse.json({ error: "You can only edit your own products" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (name !== undefined) updates.name = String(name);
    if (description !== undefined) updates.description = String(description);
    if (category !== undefined) updates.category = String(category).toLowerCase();
    if (price !== undefined) updates.price = Number(price);
    if (wholesalePrice !== undefined) updates.wholesalePrice = Number(wholesalePrice);
    if (wholesaleMinQty !== undefined) updates.wholesaleMinQty = Number(wholesaleMinQty);
    if (wholesaleUnit !== undefined) updates.wholesaleUnit = String(wholesaleUnit);
    if (Array.isArray(images)) {
      const prevImages = Array.isArray(data.images) ? data.images : [];
      const nextImages = images;
      const removed = prevImages.filter((img: string) => !nextImages.includes(img));
      await Promise.all(removed.map((img: string) => deleteLocalFile(img)));

      updates.images = images;
      updates.coverImage = images[0] ?? null;
    }

    await updateDoc(ref, updates);
    await logAdminAction({
      adminId: admin.adminId,
      action: "wholesale_update",
      targetType: "wholesale_product",
      targetId: id,
      metadata: { fields: Object.keys(updates) },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin wholesale update error:", e);
    return NextResponse.json({ error: "Failed to update wholesale product" }, { status: 500 });
  }
}

/* ---------- DELETE: remove wholesale product ---------- */
export async function DELETE(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const ref = doc(db, "products", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const data = snap.data();
    if (data.mode !== "wholesale") {
      return NextResponse.json({ error: "Not a wholesale product" }, { status: 400 });
    }
    if (admin.role === "sub" && data.createdBy !== admin.adminId) {
      return NextResponse.json({ error: "You can only delete your own products" }, { status: 403 });
    }

    const images = Array.isArray(data.images) ? data.images : [];
    await Promise.all(images.map((img: string) => deleteLocalFile(img)));

    await deleteDoc(ref);
    await logAdminAction({
      adminId: admin.adminId,
      action: "wholesale_delete",
      targetType: "wholesale_product",
      targetId: id,
      metadata: { action: "delete" },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin wholesale delete error:", e);
    return NextResponse.json({ error: "Failed to delete wholesale product" }, { status: 500 });
  }
}

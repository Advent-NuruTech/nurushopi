import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
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
import { deleteCloudinaryImages } from "@/lib/cloudinaryAdmin";
import { logAdminAction } from "@/lib/adminLogs";

/** GET: list products. Senior = all, Sub = only createdBy self */
export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode")?.toLowerCase().trim();

    const coll = collection(db, "products");
    const baseQuery =
      admin.role === "senior"
        ? query(coll, orderBy("createdAt", "desc"))
        : query(coll, where("createdBy", "==", admin.adminId));

    const q =
      mode === "wholesale"
        ? admin.role === "senior"
          ? query(coll, where("mode", "==", "wholesale"), orderBy("createdAt", "desc"))
          : query(
              coll,
              where("mode", "==", "wholesale"),
              where("createdBy", "==", admin.adminId),
              orderBy("createdAt", "desc")
            )
        : baseQuery;
    const snap = await getDocs(q);
    let products = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        price: Number(data.sellingPrice ?? data.price ?? 0),
        sellingPrice: Number(data.sellingPrice ?? data.price ?? 0),
        originalPrice:
          typeof data.originalPrice === "number" && Number.isFinite(data.originalPrice)
            ? Number(data.originalPrice)
            : undefined,
        category: data.category ?? "",
        description: data.description ?? "",
        shortDescription: data.shortDescription ?? "",
        images: data.images ?? [],
        imageUrl: data.imageUrl ?? (data.images?.[0] ?? ""),
        imagePublicIds: data.imagePublicIds ?? [],
        mode: data.mode ?? "retail",
        createdBy: data.createdBy ?? null,
        createdAt: data.createdAt,
        _ts: data.createdAt?.toMillis?.() ?? (data.createdAt ? new Date(data.createdAt as Date).getTime() : 0),
      };
    });
    if (admin.role === "sub") {
      products = products.sort((a, b) => (b._ts ?? 0) - (a._ts ?? 0));
    }
    return NextResponse.json({
      products: products.map(({ _ts, ...p }) => p),
    });
  } catch (e) {
    console.error("Admin products list error:", e);
    return NextResponse.json({ error: "Failed to list products" }, { status: 500 });
  }
}

/** POST: create product. Sets createdBy = adminId */
export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      name,
      price,
      sellingPrice,
      originalPrice,
      category,
      description,
      shortDescription,
      images,
      imagePublicIds,
    } = body as {
      name?: string;
      price?: number;
      sellingPrice?: number;
      originalPrice?: number | null;
      category?: string;
      description?: string;
      shortDescription?: string;
      images?: string[];
      imagePublicIds?: string[];
    };
    const finalPrice = sellingPrice ?? price;
    if (!name || finalPrice == null) {
      return NextResponse.json({ error: "name and price required" }, { status: 400 });
    }

    const imgList = Array.isArray(images) ? images.slice(0, 5) : [];
    const publicIdList = Array.isArray(imagePublicIds) ? imagePublicIds.slice(0, 5) : [];
    const payload: Record<string, unknown> = {
      name: String(name),
      price: Number(finalPrice),
      sellingPrice: Number(finalPrice),
      category: String(category ?? "").toLowerCase() || "other",
      description: String(description ?? ""),
      shortDescription: String(shortDescription ?? ""),
      images: imgList,
      imageUrl: imgList[0] ?? "",
      imagePublicIds: publicIdList,
      createdBy: admin.adminId,
      createdAt: serverTimestamp(),
    };
    if (typeof originalPrice === "number" && Number.isFinite(originalPrice) && originalPrice > 0) {
      payload.originalPrice = Number(originalPrice);
    }
    await addDoc(collection(db, "products"), payload);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin product create error:", e);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

/** PUT: update product. Sub can only update own */
export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const {
      id,
      name,
      price,
      sellingPrice,
      originalPrice,
      category,
      description,
      shortDescription,
      images,
      imagePublicIds,
    } = body as {
      id?: string;
      name?: string;
      price?: number;
      sellingPrice?: number;
      originalPrice?: number | null;
      category?: string;
      description?: string;
      shortDescription?: string;
      images?: string[];
      imagePublicIds?: string[];
    };
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const ref = doc(db, "products", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const data = snap.data();
    if (admin.role === "sub" && data.createdBy !== admin.adminId) {
      return NextResponse.json({ error: "You can only edit your own products" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = String(name);
    if (price !== undefined) {
      updates.price = Number(price);
      updates.sellingPrice = Number(price);
    }
    if (sellingPrice !== undefined) {
      updates.price = Number(sellingPrice);
      updates.sellingPrice = Number(sellingPrice);
    }
    if (originalPrice === null) {
      updates.originalPrice = null;
    } else if (typeof originalPrice === "number" && Number.isFinite(originalPrice) && originalPrice > 0) {
      updates.originalPrice = Number(originalPrice);
    }
    if (category !== undefined) updates.category = String(category).toLowerCase();
    if (description !== undefined) updates.description = String(description);
    if (shortDescription !== undefined) updates.shortDescription = String(shortDescription);
    const prevPublicIds = Array.isArray(data.imagePublicIds) ? data.imagePublicIds : [];
    const nextPublicIds = Array.isArray(imagePublicIds)
      ? imagePublicIds.slice(0, 5)
      : prevPublicIds;

    if (Array.isArray(images)) {
      const nextImages = images.slice(0, 5);
      updates.images = nextImages;
      updates.imageUrl = nextImages[0] ?? "";
      if (Array.isArray(imagePublicIds)) {
        updates.imagePublicIds = nextPublicIds;
        const toDelete = prevPublicIds.filter((id) => !nextPublicIds.includes(id));
        if (toDelete.length) {
          await deleteCloudinaryImages(toDelete);
        }
      }
    }
    updates.updatedAt = serverTimestamp();
    await updateDoc(ref, updates);
    await logAdminAction({
      adminId: admin.adminId,
      action: "product_update",
      targetType: "product",
      targetId: id,
      metadata: { fields: Object.keys(updates) },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin product update error:", e);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

/** DELETE: remove product. Sub can only delete own */
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
    if (admin.role === "sub" && data.createdBy !== admin.adminId) {
      return NextResponse.json({ error: "You can only delete your own products" }, { status: 403 });
    }

    const publicIds = Array.isArray(data.imagePublicIds) ? data.imagePublicIds : [];
    if (publicIds.length) {
      await deleteCloudinaryImages(publicIds);
    }

    await deleteDoc(ref);
    await logAdminAction({
      adminId: admin.adminId,
      action: "product_delete",
      targetType: "product",
      targetId: id,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin product delete error:", e);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}

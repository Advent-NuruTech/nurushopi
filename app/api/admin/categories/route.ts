import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  getDoc,
} from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { slugifyCategory } from "@/lib/categoryUtils";

type CategoryPayload = {
  id?: string;
  name?: string;
  slug?: string;
  icon?: string;
  description?: string;
};

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snap = await getDocs(query(collection(db, "categories"), orderBy("name_lowercase", "asc")));
    const categories = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name ?? "",
        slug: data.slug ?? "",
        icon: data.icon ?? "",
        description: data.description ?? "",
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null,
      };
    });
    return NextResponse.json({ categories });
  } catch (e) {
    console.error("Admin categories list error:", e);
    return NextResponse.json({ error: "Failed to list categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as CategoryPayload;
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

  const slug = slugifyCategory(String(body.slug));
    if (!slug) {
      return NextResponse.json({ error: "Invalid category name" }, { status: 400 });
    }

    const existing = await getDocs(query(collection(db, "categories"), where("slug", "==", slug)));
    if (!existing.empty) {
      return NextResponse.json({ error: "Category slug already exists" }, { status: 400 });
    }

    const docRef = await addDoc(collection(db, "categories"), {
      name,
      slug,
      icon: body.icon?.trim() || "",
      description: body.description?.trim() || "",
      name_lowercase: name.toLowerCase(),
      createdBy: admin.adminId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (e) {
    console.error("Admin category create error:", e);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as CategoryPayload;
    const id = String(body.id ?? "");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const ref = doc(db, "categories", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      updates.name = name;
      updates.name_lowercase = name.toLowerCase();
    }

    if (body.slug !== undefined) {
      const slug = slugifyCategory(String(body.slug));
      if (!slug) return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
      const existing = await getDocs(query(collection(db, "categories"), where("slug", "==", slug)));
      const conflict = existing.docs.find((d) => d.id !== id);
      if (conflict) {
        return NextResponse.json({ error: "Category slug already exists" }, { status: 400 });
      }
      updates.slug = slug;
    }

    if (body.icon !== undefined) updates.icon = String(body.icon).trim();
    if (body.description !== undefined) updates.description = String(body.description).trim();

    await updateDoc(ref, updates);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin category update error:", e);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
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

    await deleteDoc(doc(db, "categories", id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin category delete error:", e);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}

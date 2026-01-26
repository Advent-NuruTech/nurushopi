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
  serverTimestamp,
} from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

/** GET: list all banners */
export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snap = await getDocs(collection(db, "banners"));
    const banners = snap.docs
      .map((d) => {
        const data = d.data();
        const created = data.createdAt;
        const ts = created && typeof (created as { toMillis?: () => number }).toMillis === "function"
          ? (created as { toMillis: () => number }).toMillis()
          : created ? new Date(created as Date).getTime() : 0;
        return {
          id: d.id,
          imageUrl: data.image ?? data.imageUrl ?? "",
          link: data.link ?? "",
          title: data.title ?? "",
          shortDescription: data.shortDescription ?? "",
          createdAt: data.createdAt,
          _ts: ts,
        };
      })
      .sort((a, b) => (b._ts ?? 0) - (a._ts ?? 0))
      .map(({ _ts, ...b }) => b);
    return NextResponse.json({ banners });
  } catch (e) {
    console.error("Admin banners list error:", e);
    return NextResponse.json({ error: "Failed to list banners" }, { status: 500 });
  }
}

/** POST: create banner. Body: { imageUrl, link?, title?, shortDescription? } */
export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { imageUrl, link, title, shortDescription } = body as {
      imageUrl?: string;
      link?: string;
      title?: string;
      shortDescription?: string;
    };
    if (!imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });

    await addDoc(collection(db, "banners"), {
      image: imageUrl,
      imageUrl,
      link: link ?? "",
      title: title ?? "",
      shortDescription: shortDescription ?? "",
      createdAt: serverTimestamp(),
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin banner create error:", e);
    return NextResponse.json({ error: "Failed to create banner" }, { status: 500 });
  }
}

/** PUT: update banner */
export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { id, imageUrl, link, title, shortDescription } = body as {
      id?: string;
      imageUrl?: string;
      link?: string;
      title?: string;
      shortDescription?: string;
    };
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const ref = doc(db, "banners", id);
    if (!(await getDoc(ref)).exists()) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (imageUrl !== undefined) {
      updates.image = imageUrl;
      updates.imageUrl = imageUrl;
    }
    if (link !== undefined) updates.link = link;
    if (title !== undefined) updates.title = title;
    if (shortDescription !== undefined) updates.shortDescription = shortDescription;
    await updateDoc(ref, updates);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin banner update error:", e);
    return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
  }
}

/** DELETE: remove banner */
export async function DELETE(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const ref = doc(db, "banners", id);
    if (!(await getDoc(ref)).exists()) {
      return NextResponse.json({ error: "Banner not found" }, { status: 404 });
    }
    await deleteDoc(ref);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin banner delete error:", e);
    return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 });
  }
}

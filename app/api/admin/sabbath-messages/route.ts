import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

const MAX_RESULTS = 500;

const isFridayDate = (value: string) => {
  if (!value) return false;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getUTCDay() === 5;
};

const toISO = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
};

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? 200);
  const safeLimit = Math.min(Math.max(rawLimit, 1), MAX_RESULTS);

  const q = query(
    collection(db, "sabbathMessages"),
    orderBy("sabbathDate", "desc"),
    orderBy("createdAt", "desc"),
    limit(safeLimit)
  );

  const snap = await getDocs(q);
  const messages = snap.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    return {
      id: docSnap.id,
      message: String(data.message ?? ""),
      sabbathDate: String(data.sabbathDate ?? ""),
      createdAt: toISO(data.createdAt),
      updatedAt: toISO(data.updatedAt),
      createdBy: String(data.createdBy ?? ""),
    };
  });

  return NextResponse.json({ messages, total: messages.length });
}

export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    message?: string;
    sabbathDate?: string;
  };

  const message = String(body.message ?? "").trim();
  const sabbathDate = String(body.sabbathDate ?? "").trim();

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  if (!sabbathDate || !isFridayDate(sabbathDate)) {
    return NextResponse.json(
      { error: "Sabbath date must be a Friday (YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  const ref = await addDoc(collection(db, "sabbathMessages"), {
    message: message.slice(0, 5000),
    sabbathDate,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: admin.adminId,
  });

  return NextResponse.json({ success: true, id: ref.id });
}

export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    sabbathDate?: string;
  };

  const id = String(body.id ?? "").trim();
  const message = String(body.message ?? "").trim();
  const sabbathDate = String(body.sabbathDate ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Message id is required." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  if (!sabbathDate || !isFridayDate(sabbathDate)) {
    return NextResponse.json(
      { error: "Sabbath date must be a Friday (YYYY-MM-DD)." },
      { status: 400 }
    );
  }

  await updateDoc(doc(db, "sabbathMessages", id), {
    message: message.slice(0, 5000),
    sabbathDate,
    updatedAt: serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = String(url.searchParams.get("id") ?? "").trim();

  if (!id) {
    return NextResponse.json({ error: "Message id is required." }, { status: 400 });
  }

  await deleteDoc(doc(db, "sabbathMessages", id));
  return NextResponse.json({ success: true });
}

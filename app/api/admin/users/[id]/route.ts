import { NextResponse } from "next/server";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAdminFromRequest } from "@/lib/adminAuth";

type DocWithCreatedAt = {
  id: string;
  createdAt?: { seconds?: number } | string | number | null;
  [key: string]: unknown;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: userId } = await params;
    const userSnap = await getDoc(doc(db, "users", userId));
    if (!userSnap.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = { id: userSnap.id, ...(userSnap.data() as Record<string, unknown>) };

    const toSeconds = (value: DocWithCreatedAt["createdAt"]) => {
      if (!value) return 0;
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
      }
      if (typeof value === "object" && typeof value.seconds === "number") return value.seconds;
      return 0;
    };

    const mapAndSort = (docs: Array<{ id: string; data: () => unknown }>) =>
      docs
        .map((d) => {
          const data = d.data() as Record<string, unknown>;
          return { id: d.id, ...data } as DocWithCreatedAt;
        })
        .sort((a, b) => toSeconds(b.createdAt) - toSeconds(a.createdAt));

    const ordersSnap = await getDocs(
      query(collection(db, "orders"), where("userId", "==", userId))
    );
    const orders = mapAndSort(ordersSnap.docs);

    const txSnap = await getDocs(
      query(
        collection(db, "wallet_transactions"),
        where("userId", "==", userId)
      )
    );
    const transactions = mapAndSort(txSnap.docs);

    const redSnap = await getDocs(
      query(
        collection(db, "wallet_redemptions"),
        where("userId", "==", userId)
      )
    );
    const redemptions = mapAndSort(redSnap.docs);

    return NextResponse.json({ user, orders, transactions, redemptions });
  } catch (e) {
    console.error("Admin user detail error:", e);
    return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: userId } = await params;

    const targets = [
      { coll: "orders", field: "userId", value: userId },
      { coll: "reviews", field: "userId", value: userId },
      { coll: "wallet_transactions", field: "userId", value: userId },
      { coll: "wallet_redemptions", field: "userId", value: userId },
      { coll: "notifications", field: "recipientId", value: userId },
      { coll: "messages", field: "participantIds", value: userId, arrayContains: true },
    ];

    for (const t of targets) {
      const q = t.arrayContains
        ? query(collection(db, t.coll), where(t.field, "array-contains", t.value))
        : query(collection(db, t.coll), where(t.field, "==", t.value));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, t.coll, d.id))));
    }

    await deleteDoc(doc(db, "users", userId));

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin user delete error:", e);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

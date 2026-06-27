import { NextResponse } from "next/server";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAdminFromRequest } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/adminLogs";

type ReviewDoc = {
  id: string;
  createdAt?: { seconds?: number } | string | number | null;
  [key: string]: unknown;
};

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "pending";
    const productId = url.searchParams.get("productId");

    const filters = [where("status", "==", status)];
    if (productId) filters.push(where("productId", "==", productId));

    const snap = await getDocs(
      query(collection(db, "reviews"), ...filters)
    );
    const reviews = snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return { id: d.id, ...data } as ReviewDoc;
      })
      .sort((a, b) => {
        const toSeconds = (value: ReviewDoc["createdAt"]) => {
          if (!value) return 0;
          if (typeof value === "number") return value;
          if (typeof value === "string") {
            const parsed = Date.parse(value);
            return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
          }
          if (typeof value === "object" && typeof value.seconds === "number") return value.seconds;
          return 0;
        };
        const aDate = toSeconds(a.createdAt);
        const bDate = toSeconds(b.createdAt);
        return bDate - aDate;
      });
    return NextResponse.json({ reviews });
  } catch (e) {
    console.error("Admin reviews list error:", e);
    return NextResponse.json({ error: "Failed to list reviews" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { reviewId?: string; status?: "approved" | "rejected" };
    const reviewId = String(body.reviewId ?? "");
    const status = body.status;

    if (!reviewId || (status !== "approved" && status !== "rejected")) {
      return NextResponse.json({ error: "reviewId and status required" }, { status: 400 });
    }

    const ref = doc(db, "reviews", reviewId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    await updateDoc(ref, {
      status,
      approvedBy: admin.adminId,
      approvedAt: serverTimestamp(),
    });

    await logAdminAction({
      adminId: admin.adminId,
      action: status === "approved" ? "review_approved" : "review_rejected",
      targetType: "review",
      targetId: reviewId,
      metadata: { status },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin review update error:", e);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}

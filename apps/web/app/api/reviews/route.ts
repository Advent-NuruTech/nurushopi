import { NextResponse } from "next/server";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getClientKey, rateLimit } from "@/lib/rateLimit";
import { notifySeniorAdmins } from "@/lib/notifications";

/* ---------- Types ---------- */

type ReviewInput = {
  productId: string;
  message: string;
  productName?: string;
};

type ReviewDoc = {
  id: string;
  productId?: string;
  orderId?: string;
  userId?: string;
  userName?: string;
  message?: string;
  productName?: string | null;
  status?: string;
  createdAt?: Timestamp | { seconds?: number } | string | number | null;
};

type OrderItem = {
  productId?: string;
  id?: string;
};

type OrderDoc = {
  userId?: string;
  status?: string;
  items?: OrderItem[];
};

/* ---------------- GET ---------------- */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    const orderId = url.searchParams.get("orderId");
    const userId = url.searchParams.get("userId");

    const toSeconds = (value: ReviewDoc["createdAt"]): number => {
      if (!value) return 0;
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
      }
      if (value instanceof Date) return Math.floor(value.getTime() / 1000);
      if (value instanceof Timestamp) return value.seconds;
      if (typeof value === "object") {
        return typeof value.seconds === "number" ? value.seconds : 0;
      }
      return 0;
    };

    const mapReviews = (
      snap: QuerySnapshot<DocumentData>
    ): ReviewDoc[] =>
      snap.docs
        .map((d) => {
          const data = d.data() as Omit<ReviewDoc, "id">;
          return { id: d.id, ...data } as ReviewDoc;
        })
        .sort((a, b) => {
          const aDate = toSeconds(a.createdAt);
          const bDate = toSeconds(b.createdAt);
          return bDate - aDate;
        });

    if (productId) {
      const snap = await getDocs(
        query(
          collection(db, "reviews"),
          where("productId", "==", productId),
          where("status", "==", "approved")
        )
      );

      return NextResponse.json({ reviews: mapReviews(snap) });
    }

    if (orderId && userId) {
      const snap = await getDocs(
        query(
          collection(db, "reviews"),
          where("orderId", "==", orderId),
          where("userId", "==", userId)
        )
      );

      return NextResponse.json({ reviews: mapReviews(snap) });
    }

    return NextResponse.json(
      { error: "productId or orderId+userId required" },
      { status: 400 }
    );
  } catch (e) {
    console.error("Reviews GET error:", e);
    return NextResponse.json(
      { error: "Failed to load reviews" },
      { status: 500 }
    );
  }
}

/* ---------------- POST ---------------- */
export async function POST(request: Request) {
  try {
    const key = getClientKey(request);
    const rl = rateLimit(`${key}:reviews`, {
      limit: 10,
      windowMs: 60_000,
    });

    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body: {
      userId?: string;
      userName?: string;
      orderId?: string;
      reviews?: ReviewInput[];
    } = await request.json();

    const userId = String(body.userId ?? "");
    const userName = String(body.userName ?? "").trim();
    const orderId = String(body.orderId ?? "");
    const reviews = Array.isArray(body.reviews) ? body.reviews : [];

    if (!userId || !userName || !orderId) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const orderSnap = await getDoc(doc(db, "orders", orderId));
    if (!orderSnap.exists()) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    const orderData = orderSnap.data() as OrderDoc;

    if (orderData.userId && orderData.userId !== userId) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    if (String(orderData.status ?? "") !== "received") {
      return NextResponse.json(
        { error: "Order not delivered yet" },
        { status: 403 }
      );
    }

    const orderItems: OrderItem[] = Array.isArray(orderData.items)
      ? orderData.items
      : [];

    const allowedProductIds = new Set(
      orderItems
        .map((it) => it.productId || it.id)
        .filter((v): v is string => Boolean(v))
    );

    const validReviews: ReviewInput[] = reviews
      .map((r) => ({
        productId: String(r.productId ?? ""),
        message: String(r.message ?? "").trim(),
        productName: String(r.productName ?? "").trim(),
      }))
      .filter((r) => Boolean(r.productId && r.message));

    if (!validReviews.length) {
      return NextResponse.json(
        { error: "No reviews to submit" },
        { status: 400 }
      );
    }

    for (const r of validReviews) {
      if (!allowedProductIds.has(r.productId)) {
        return NextResponse.json(
          { error: "Invalid product in order" },
          { status: 400 }
        );
      }
    }

    let created = 0;
    const createdIds: string[] = [];

    for (const r of validReviews) {
      const reviewKey = `${orderId}_${r.productId}_${userId}`;
      const ref = doc(db, "reviews", reviewKey);
      const existing = await getDoc(ref);

      if (existing.exists()) continue;

      await setDoc(ref, {
        productId: r.productId,
        orderId,
        userId,
        userName,
        message: r.message,
        productName: r.productName || null,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      created++;
      createdIds.push(reviewKey);
    }

    if (created > 0) {
      await notifySeniorAdmins({
        title: "New reviews pending",
        body: `${userName} submitted ${created} review(s) for approval.`,
        type: "review",
        relatedId: createdIds[0] ?? orderId,
      });
    }

    return NextResponse.json({ success: true, created });
  } catch (e) {
    console.error("Reviews POST error:", e);
    return NextResponse.json(
      { error: "Failed to submit reviews" },
      { status: 500 }
    );
  }
}

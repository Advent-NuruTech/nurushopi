import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  FieldValue,
  increment,
  runTransaction,
} from "firebase/firestore";
import { getClientKey, rateLimit } from "@/lib/rateLimit";

// Firestore collection reference
const ordersCollection = collection(db, "orders");

/** 🔹 Type for individual order items */
interface OrderItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  mode?: "wholesale" | "retail";
}

/** 🔹 Type stored in Firestore */
interface FirestoreOrder {
  userId?: string | null;
  userEmail?: string | null;
  referrerId?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  country: string;
  county: string;
  locality: string;
  message?: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
}

/** 🔹 Type returned to client */
interface Order {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  referrerId?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  country: string;
  county: string;
  locality: string;
  message?: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  createdAt: string; // always ISO string
  updatedAt?: string;
}

/** 🟢 Create a new order */
export async function POST(request: Request) {
  try {
    const rl = rateLimit(getClientKey(request), { limit: 10, windowMs: 60_000, keyPrefix: "orders" });
    if (!rl.ok) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body: Partial<FirestoreOrder> = await request.json();

    const {
      userId,
      userEmail,
      referrerId,
      items,
      totalAmount,
      status,
      name,
      phone,
      email,
      country,
      county,
      locality,
      message,
    } = body;

    // Validate required fields
    if (!name || !phone || !country || !county || !locality || !items || !totalAmount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let finalReferrerId = referrerId ?? null;
    if (!finalReferrerId && userId) {
      try {
        const userSnap = await getDoc(doc(db, "users", userId));
        if (userSnap.exists()) {
          finalReferrerId = (userSnap.data()?.referredBy as string | undefined) ?? null;
        }
      } catch {
        // ignore referral lookup
      }
    }

    const newOrder: FirestoreOrder = {
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      referrerId: finalReferrerId,
      name,
      phone,
      email: email ?? null,
      country,
      county,
      locality,
      message: message ?? "",
      items,
      totalAmount,
      status: status ?? "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(ordersCollection, newOrder);

    try {
      if (userId && finalReferrerId && finalReferrerId !== userId) {
        const userRef = doc(db, "users", userId);
        const referrerRef = doc(db, "users", finalReferrerId);
        await runTransaction(db, async (tx) => {
          const userSnap = await tx.get(userRef);
          const existingReferrer = userSnap.exists()
            ? (userSnap.data()?.referredBy as string | undefined)
            : undefined;
          if (existingReferrer) return;

          tx.set(
            userRef,
            { referredBy: finalReferrerId, updatedAt: serverTimestamp() },
            { merge: true }
          );

          tx.set(
            referrerRef,
            { inviteCount: increment(1), updatedAt: serverTimestamp() },
            { merge: true }
          );
        });
      }
    } catch (refErr) {
      console.error("Order referral save error:", refErr);
    }

    try {
      const notificationsRef = collection(db, "notifications");

      const adminsSnap = await getDocs(
        query(collection(db, "admins"), where("role", "==", "senior"))
      );
      const seniorIds = new Set<string>();
      adminsSnap.forEach((d) => seniorIds.add(d.id));

      const productIds = Array.from(
        new Set(
          (items ?? [])
            .map((it) => it.productId || it.id)
            .filter((id): id is string => Boolean(id))
        )
      );

      const uploaderIds = new Set<string>();
      if (productIds.length) {
        const snaps = await Promise.all(
          productIds.map((pid) => getDoc(doc(db, "products", pid)))
        );
        snaps.forEach((snap) => {
          if (!snap.exists()) return;
          const createdBy = snap.data()?.createdBy as string | undefined;
          if (createdBy) uploaderIds.add(createdBy);
        });
      }

      const recipientIds = new Set<string>([...seniorIds, ...uploaderIds]);
      const bodyText = `${name} placed a new order (${items?.length ?? 0} items).`;

      await Promise.all(
        Array.from(recipientIds).map((adminId) =>
          addDoc(notificationsRef, {
            recipientType: "admin",
            recipientId: adminId,
            type: "order",
            title: "New order placed",
            body: bodyText,
            relatedId: docRef.id,
            readAt: null,
            createdAt: serverTimestamp(),
          })
        )
      );
    } catch (notifyError) {
      console.error("Order notification error:", notifyError);
    }

    return NextResponse.json({ success: true, orderId: docRef.id }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/orders error", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 🟡 Get all orders or filter by userId */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    const q = userId
      ? query(
          ordersCollection,
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        )
      : query(ordersCollection, orderBy("createdAt", "desc"));

    const snap = await getDocs(q);

    const orders: Order[] = snap.docs.map((docSnap) => {
      const data = docSnap.data() as FirestoreOrder;

      const createdAtTs = data.createdAt as Timestamp | FieldValue | undefined;
      const updatedAtTs = data.updatedAt as Timestamp | FieldValue | undefined;

      return {
        id: docSnap.id,
        userId: data.userId ?? null,
        userEmail: data.userEmail ?? null,
        referrerId: data.referrerId ?? null,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        country: data.country,
        county: data.county,
        locality: data.locality,
        message: data.message ?? "",
        items: data.items,
        totalAmount: data.totalAmount,
        status: data.status,
        createdAt:
          createdAtTs && "toDate" in createdAtTs
            ? (createdAtTs as Timestamp).toDate().toISOString()
            : new Date().toISOString(),
        updatedAt:
          updatedAtTs && "toDate" in updatedAtTs
            ? (updatedAtTs as Timestamp).toDate().toISOString()
            : undefined,
      };
    });

    return NextResponse.json({ orders }, { status: 200 });
  } catch (err: unknown) {
    console.error("GET /api/orders error", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 🟠 Update order */
export async function PUT(request: Request) {
  try {
    const body: { orderId?: string; updates?: Partial<FirestoreOrder>; userId?: string } =
      await request.json();
    const { orderId, updates, userId } = body;

    if (!orderId || !updates) {
      return NextResponse.json({ error: "Missing orderId or updates" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderSnap.data() as FirestoreOrder;
    if (userId && orderData.userId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const requestedStatus = String(updates.status ?? "").toLowerCase();
    if (requestedStatus !== "cancelled") {
      return NextResponse.json(
        { error: "Only cancellation is allowed from this endpoint" },
        { status: 403 }
      );
    }

    const currentStatus = String(orderData.status ?? "pending").toLowerCase();
    if (currentStatus !== "pending" && currentStatus !== "shipped") {
      return NextResponse.json(
        { error: "Only pending or shipped orders can be cancelled" },
        { status: 400 }
      );
    }

    const createdAtValue = orderData.createdAt;
    let createdAtMs = 0;
    if (createdAtValue && typeof (createdAtValue as { toDate?: () => Date }).toDate === "function") {
      createdAtMs = (createdAtValue as Timestamp).toDate().getTime();
    } else if (typeof createdAtValue === "string") {
      const parsed = Date.parse(createdAtValue);
      createdAtMs = Number.isNaN(parsed) ? 0 : parsed;
    }

    if (!createdAtMs || Date.now() - createdAtMs > 24 * 60 * 60 * 1000) {
      return NextResponse.json(
        { error: "Cancellation window is 24 hours from order time" },
        { status: 400 }
      );
    }

    await updateDoc(orderRef, {
      status: "cancelled",
      cancelledBy: userId ?? null,
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("PUT /api/orders error", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** 🔴 Delete order */
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    const userId = url.searchParams.get("userId");

    if (!orderId || !userId) {
      return NextResponse.json({ error: "Missing orderId or userId" }, { status: 400 });
    }

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderSnap.data() as FirestoreOrder;
    if (orderData.userId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await deleteDoc(orderRef);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    console.error("DELETE /api/orders error", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

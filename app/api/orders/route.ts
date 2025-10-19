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
} from "firebase/firestore";

// Firestore collection reference
const ordersCollection = collection(db, "orders");

/**
 * 🟢 Create a new order
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      userEmail,
      items,
      total,
      status,
      name,
      phone,
      email,
      county,
      locality,
      message,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // ✅ Include all checkout form data
    const newOrder = {
      userId,
      userEmail: userEmail ?? null,
      name: name ?? "",
      phone: phone ?? "",
      email: email ?? "",
      county: county ?? "",
      locality: locality ?? "",
      message: message ?? "",
      items: items ?? [],
      totalAmount: total ?? 0, // match field used in received page
      status: status ?? "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(ordersCollection, newOrder);

    return NextResponse.json(
      { success: true, orderId: docRef.id },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/orders error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * 🟡 Get all orders or filter by userId
 */
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
    const orders: any[] = [];

    snap.forEach((doc) => {
      const data = doc.data();
      orders.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : new Date().toISOString(),
      });
    });

    return NextResponse.json({ orders }, { status: 200 });
  } catch (err) {
    console.error("GET /api/orders error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * 🟠 Update order
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { orderId, updates, userId } = body;

    if (!orderId || !updates) {
      return NextResponse.json(
        { error: "Missing orderId or updates" },
        { status: 400 }
      );
    }

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderSnap.data();
    if (userId && orderData?.userId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await updateDoc(orderRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("PUT /api/orders error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * 🔴 Delete order
 */
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId");
    const userId = url.searchParams.get("userId");

    if (!orderId || !userId) {
      return NextResponse.json(
        { error: "Missing orderId or userId" },
        { status: 400 }
      );
    }

    const orderRef = doc(db, "orders", orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = orderSnap.data();
    if (orderData?.userId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await deleteDoc(orderRef);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/orders error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

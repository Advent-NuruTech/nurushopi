import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

function toDateStr(t: unknown): string {
  if (!t) return new Date().toISOString();
  if (typeof (t as { toDate?: () => Date }).toDate === "function") {
    return (t as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof t === "string") return t;
  if (typeof t === "number") return new Date(t).toISOString();
  return new Date().toISOString();
}

/**
 * GET: list orders
 * - Senior admin: all orders
 * - Sub admin: orders containing at least one product they created
 */
export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const productIds = new Set<string>();

    if (admin.role === "sub") {
      const prodsSnap = await getDocs(
        query(
          collection(db, "products"),
          where("createdBy", "==", admin.adminId)
        )
      );

      prodsSnap.forEach((d) => productIds.add(d.id));
    }

    const ordersSnap = await getDocs(
      query(collection(db, "orders"), orderBy("createdAt", "desc"))
    );

    let orders = ordersSnap.docs.map((d) => {
      const data = d.data();
      const items =
        (data.items ?? []) as {
          id?: string;
          productId?: string;
          name?: string;
          price?: number;
          quantity?: number;
        }[];

      return {
        id: d.id,
        userId: data.userId ?? null,
        userEmail: data.userEmail ?? null,
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        country: data.country,
        county: data.county,
        locality: data.locality,
        message: data.message ?? "",
        items,
        totalAmount: data.totalAmount ?? 0,
        status: data.status ?? "pending",
        approvedBy: data.approvedBy ?? null,
        createdAt: toDateStr(data.createdAt),
        updatedAt: data.updatedAt ? toDateStr(data.updatedAt) : undefined,
      };
    });

    if (admin.role === "sub") {
      orders = orders.filter((order) =>
        order.items.some(
          (it) =>
            (it.id && productIds.has(it.id)) ||
            (it.productId && productIds.has(it.productId))
        )
      );
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Admin orders list error:", error);
    return NextResponse.json(
      { error: "Failed to list orders" },
      { status: 500 }
    );
  }
}

/**
 * PUT: approve / cancel order (senior admin only)
 * Body: { orderId, status }
 */
export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (admin.role !== "senior") {
    return NextResponse.json(
      { error: "Only Senior Admin can approve orders" },
      { status: 403 }
    );
  }

  try {
    const { orderId, status } = (await request.json()) as {
      orderId?: string;
      status?: string;
    };

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId required" },
        { status: 400 }
      );
    }

    const ref = doc(db, "orders", orderId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (status === "approved" || status === "received") {
      updates.status = "received";
      updates.approvedBy = admin.adminId;
    } else if (status === "cancelled") {
      updates.status = "cancelled";
    }

    await updateDoc(ref, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin order update error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

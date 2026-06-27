import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

type OrderItem = {
  id?: string;
  productId?: string;
};

type OrderDoc = {
  status?: string;
  totalAmount?: number;
  items?: OrderItem[];
};

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (admin.role === "senior") {
      const [usersSnap, adminsSnap, productsSnap, ordersSnap, reviewsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "admins")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "reviews")),
      ]);

      let wholesaleCount = 0;
      productsSnap.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        if (String(data.mode ?? "retail") === "wholesale") {
          wholesaleCount += 1;
        }
      });
      const retailCount = productsSnap.size - wholesaleCount;

      let totalSales = 0;
      let cancelledOrders = 0;
      ordersSnap.forEach((docSnap) => {
        const data = docSnap.data() as OrderDoc;
        const status = String(data.status ?? "pending");
        if (status === "cancelled") {
          cancelledOrders += 1;
          return;
        }
        totalSales += Number(data.totalAmount ?? 0);
      });

      const subAdminsCount = adminsSnap.docs.filter((d) => d.data().role === "sub").length;

      return NextResponse.json({
        stats: {
          users: usersSnap.size,
          admins: adminsSnap.size,
          subAdmins: subAdminsCount,
          products: productsSnap.size,
          wholesaleProducts: wholesaleCount,
          retailProducts: retailCount,
          totalSales,
          totalCancellations: cancelledOrders,
          totalReviews: reviewsSnap.size,
        },
      });
    }

    const [productsSnap, ordersSnap] = await Promise.all([
      getDocs(query(collection(db, "products"), where("createdBy", "==", admin.adminId))),
      getDocs(collection(db, "orders")),
    ]);

    const ownedProductIds = new Set(productsSnap.docs.map((d) => d.id));
    let wholesaleCount = 0;
    productsSnap.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      if (String(data.mode ?? "retail") === "wholesale") {
        wholesaleCount += 1;
      }
    });

    let totalSales = 0;
    let cancelledOrders = 0;
    let matchedOrders = 0;
    ordersSnap.forEach((docSnap) => {
      const data = docSnap.data() as OrderDoc;
      const items = Array.isArray(data.items) ? data.items : [];
      const hasOwnedItem = items.some((it) => {
        const productId = it.productId ?? it.id ?? "";
        return Boolean(productId) && ownedProductIds.has(productId);
      });
      if (!hasOwnedItem) return;

      matchedOrders += 1;
      const status = String(data.status ?? "pending");
      if (status === "cancelled") {
        cancelledOrders += 1;
        return;
      }
      totalSales += Number(data.totalAmount ?? 0);
    });

    return NextResponse.json({
      stats: {
        users: 0,
        admins: 0,
        subAdmins: 0,
        products: productsSnap.size,
        wholesaleProducts: wholesaleCount,
        retailProducts: productsSnap.size - wholesaleCount,
        totalSales,
        totalCancellations: cancelledOrders,
        totalReviews: 0,
        orders: matchedOrders,
      },
    });
  } catch (error) {
    console.error("Admin dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 });
  }
}


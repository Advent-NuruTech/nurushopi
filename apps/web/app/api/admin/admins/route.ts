import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, deleteDoc, query, where } from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

/** GET: list all admins (senior only) */
export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const snap = admin.role === "senior"
      ? await getDocs(collection(db, "admins"))
      : await getDocs(query(collection(db, "admins"), where("role", "==", "senior")));
    const baseAdmins = snap.docs.map((d) => {
      const data = d.data();
      return {
        adminId: d.id,
        name: data.name ?? "",
        email: data.email ?? "",
        role: data.role ?? "sub",
        createdAt: data.createdAt,
      };
    });

    if (admin.role !== "senior") {
      return NextResponse.json({ admins: baseAdmins, total: baseAdmins.length });
    }

    const [productsSnap, ordersSnap] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(collection(db, "orders")),
    ]);

    const productOwner = new Map<string, string>();
    const productStats = new Map<string, { count: number; value: number }>();

    productsSnap.forEach((p) => {
      const data = p.data() as Record<string, unknown>;
      const createdBy = String(data.createdBy ?? "");
      if (createdBy) {
        const current = productStats.get(createdBy) ?? { count: 0, value: 0 };
        current.count += 1;
        current.value += Number(data.sellingPrice ?? data.price ?? 0);
        productStats.set(createdBy, current);
        productOwner.set(p.id, createdBy);
      }
    });

    let totalSales = 0;
    const salesByAdmin = new Map<string, number>();

    ordersSnap.forEach((o) => {
      const data = o.data() as Record<string, unknown>;
      totalSales += Number(data.totalAmount ?? 0);
      const items = Array.isArray(data.items) ? data.items : [];
      items.forEach((it) => {
        const item = it as { productId?: string; id?: string; price?: number; quantity?: number };
        const productId = item.productId || item.id;
        if (!productId) return;
        const owner = productOwner.get(productId);
        if (!owner) return;
        const itemTotal = Number(item.price ?? 0) * Number(item.quantity ?? 0);
        salesByAdmin.set(owner, (salesByAdmin.get(owner) ?? 0) + itemTotal);
      });
    });

    const admins = baseAdmins.map((a) => {
      const stats = productStats.get(a.adminId) ?? { count: 0, value: 0 };
      const sales = salesByAdmin.get(a.adminId) ?? 0;
      return {
        ...a,
        productCount: stats.count,
        productValue: stats.value,
        salesTotal: sales,
      };
    });

    return NextResponse.json({
      admins,
      total: admins.length,
      totals: {
        totalProducts: productsSnap.size,
        totalSales,
      },
    });
  } catch (e) {
    console.error("Admin list error:", e);
    return NextResponse.json({ error: "Failed to list admins" }, { status: 500 });
  }
}

/** DELETE: remove an admin (senior only, cannot delete self) */
export async function DELETE(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const targetId = url.searchParams.get("adminId");
    if (!targetId) {
      return NextResponse.json({ error: "adminId required" }, { status: 400 });
    }
    if (targetId === admin.adminId) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    await deleteDoc(doc(db, "admins", targetId));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin delete error:", e);
    return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 });
  }
}

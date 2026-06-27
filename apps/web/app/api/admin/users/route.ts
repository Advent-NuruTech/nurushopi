import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [usersSnap, ordersSnap] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "orders")),
    ]);

    const orderStats = new Map<string, { count: number; spend: number }>();
    ordersSnap.forEach((o) => {
      const data = o.data() as Record<string, unknown>;
      const userId = String(data.userId ?? "");
      if (!userId) return;
      const current = orderStats.get(userId) ?? { count: 0, spend: 0 };
      current.count += 1;
      current.spend += Number(data.totalAmount ?? 0);
      orderStats.set(userId, current);
    });

    const users = usersSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      const stats = orderStats.get(d.id) ?? { count: 0, spend: 0 };
      return {
        id: d.id,
        name: (data.fullName as string) || (data.name as string) || (data.email as string) || "User",
        email: (data.email as string) || "",
        phone: (data.phone as string) || "",
        walletBalance: Number(data.walletBalance ?? 0),
        totalOrders: stats.count,
        totalSpend: stats.spend,
        lastLogin: data.lastLogin ?? null,
        createdAt: data.createdAt ?? null,
      };
    });
    return NextResponse.json({ users });
  } catch (e) {
    console.error("Admin users list error:", e);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

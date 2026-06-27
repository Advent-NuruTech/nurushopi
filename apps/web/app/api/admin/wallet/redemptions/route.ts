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
import { debitWallet } from "@/lib/wallet";
import { logAdminAction } from "@/lib/adminLogs";

type RedemptionDoc = {
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
    const status = url.searchParams.get("status") ?? "pending";
    const snap = await getDocs(
      query(
        collection(db, "wallet_redemptions"),
        where("status", "==", status)
      )
    );
    const redemptions = snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return { id: d.id, ...data } as RedemptionDoc;
      })
      .sort((a, b) => {
        const toSeconds = (value: RedemptionDoc["createdAt"]) => {
          if (!value) return 0;
          if (typeof value === "number") return value;
          if (typeof value === "string") {
            const parsed = Date.parse(value);
            return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
          }
          if (typeof value === "object" && typeof value.seconds === "number") return value.seconds;
          return 0;
        };
        return toSeconds(b.createdAt) - toSeconds(a.createdAt);
      });
    return NextResponse.json({ redemptions });
  } catch (e) {
    console.error("Admin redemptions list error:", e);
    return NextResponse.json({ error: "Failed to list redemptions" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "senior") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { id?: string; status?: "approved" | "rejected" };
    const id = String(body.id ?? "");
    const status = body.status;
    if (!id || (status !== "approved" && status !== "rejected")) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 });
    }

    const ref = doc(db, "wallet_redemptions", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return NextResponse.json({ error: "Redemption not found" }, { status: 404 });
    }

    const data = snap.data() as Record<string, unknown>;
    if (String(data.status ?? "") !== "pending") {
      return NextResponse.json({ error: "Redemption already processed" }, { status: 400 });
    }

    if (status === "approved") {
      const userId = String(data.userId ?? "");
      const amount = Number(data.amount ?? 0);
      if (!userId || !amount) {
        return NextResponse.json({ error: "Invalid redemption data" }, { status: 400 });
      }

      await debitWallet({
        userId,
        amount,
        source: "redeem",
        redemptionId: id,
        metadata: { approvedBy: admin.adminId },
      });
    }

    await updateDoc(ref, {
      status,
      approvedBy: admin.adminId,
      approvedAt: serverTimestamp(),
    });

    await logAdminAction({
      adminId: admin.adminId,
      action: status === "approved" ? "wallet_redeem_approved" : "wallet_redeem_rejected",
      targetType: "wallet_redemption",
      targetId: id,
      metadata: { status },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin redemption update error:", e);
    return NextResponse.json({ error: "Failed to update redemption" }, { status: 500 });
  }
}

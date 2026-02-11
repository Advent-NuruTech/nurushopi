import { NextResponse } from "next/server";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getClientKey, rateLimit } from "@/lib/rateLimit";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const userSnap = await getDoc(doc(db, "users", userId));
    const userData = userSnap.exists() ? userSnap.data() : {};
    const walletBalance = Number(userData?.walletBalance ?? 0);

    const txSnap = await getDocs(
      query(
        collection(db, "wallet_transactions"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      )
    );
    const transactions = txSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));

    const redSnap = await getDocs(
      query(
        collection(db, "wallet_redemptions"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      )
    );
    const redemptions = redSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));

    return NextResponse.json({
      walletBalance,
      transactions,
      redemptions,
    });
  } catch (e) {
    console.error("Wallet GET error:", e);
    return NextResponse.json({ error: "Failed to load wallet" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const rl = rateLimit(getClientKey(request), { limit: 5, windowMs: 60_000, keyPrefix: "wallet" });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  return NextResponse.json({ error: "Not implemented" }, { status: 405 });
}

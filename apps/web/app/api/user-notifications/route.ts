import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

type NotificationDoc = {
  recipientType?: string;
  createdAt?: unknown;
  [key: string]: unknown;
};

function toSeconds(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? Math.floor(value / 1000) : 0;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
  }
  if (typeof value === "object" && value !== null) {
    const timestamp = value as {
      toMillis?: () => number;
      toDate?: () => Date;
      seconds?: number;
      nanoseconds?: number;
    };

    if (typeof timestamp.toMillis === "function") {
      const ms = timestamp.toMillis();
      return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
    }

    if (typeof timestamp.toDate === "function") {
      const date = timestamp.toDate();
      const ms = date instanceof Date ? date.getTime() : NaN;
      return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
    }

    if (typeof timestamp.seconds === "number") {
      const nanos = typeof timestamp.nanoseconds === "number" ? timestamp.nanoseconds : 0;
      return timestamp.seconds + Math.floor(nanos / 1_000_000_000);
    }
  }
  return 0;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const snap = await getDocs(
      query(
        collection(db, "notifications"),
        where("recipientId", "==", userId)
      )
    );

    const notifications: Array<{ id: string } & NotificationDoc> = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as NotificationDoc) }))
      .filter((n) => (n.recipientType ?? "user") === "user")
      .sort((a, b) => {
        return toSeconds(b.createdAt) - toSeconds(a.createdAt);
      });
    return NextResponse.json({ notifications });
  } catch (e) {
    console.error("User notifications list error:", e);
    return NextResponse.json({ error: "Failed to list notifications" }, { status: 500 });
  }
}

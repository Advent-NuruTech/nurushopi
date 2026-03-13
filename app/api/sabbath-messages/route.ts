import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  Timestamp,
} from "firebase/firestore";

const MAX_LIMIT = 20;

const toISO = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date");
  const rawLimit = Number(url.searchParams.get("limit") ?? 5);
  const safeLimit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT);

  const cursorDate = url.searchParams.get("cursorDate") ?? "";
  const cursorCreatedAt = url.searchParams.get("cursorCreatedAt") ?? "";

  let currentMessage: Record<string, unknown> | null = null;
  if (date) {
    const currentQuery = query(
      collection(db, "sabbathMessages"),
      where("sabbathDate", "==", date),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const currentSnap = await getDocs(currentQuery);
    if (!currentSnap.empty) {
      const docSnap = currentSnap.docs[0];
      const data = docSnap.data() as Record<string, unknown>;
      currentMessage = {
        id: docSnap.id,
        message: String(data.message ?? ""),
        sabbathDate: String(data.sabbathDate ?? ""),
        createdAt: toISO(data.createdAt),
      };
    }
  }

  const baseQuery = [
    collection(db, "sabbathMessages"),
    orderBy("sabbathDate", "desc"),
    orderBy("createdAt", "desc"),
  ] as const;

  let historyQuery = query(...baseQuery, limit(safeLimit));
  if (cursorDate && cursorCreatedAt) {
    const cursorDateValue = new Date(cursorCreatedAt);
    if (!Number.isNaN(cursorDateValue.getTime())) {
      historyQuery = query(
        ...baseQuery,
        startAfter(cursorDate, Timestamp.fromDate(cursorDateValue)),
        limit(safeLimit)
      );
    }
  }

  const historySnap = await getDocs(historyQuery);
  const messages = historySnap.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    return {
      id: docSnap.id,
      message: String(data.message ?? ""),
      sabbathDate: String(data.sabbathDate ?? ""),
      createdAt: toISO(data.createdAt),
    };
  });

  const lastDoc = historySnap.docs[historySnap.docs.length - 1];
  const lastData = lastDoc?.data() as Record<string, unknown> | undefined;
  const nextCursor = lastDoc
    ? {
        sabbathDate: String(lastData?.sabbathDate ?? ""),
        createdAt: toISO(lastData?.createdAt),
      }
    : null;

  return NextResponse.json({
    currentMessage,
    messages,
    nextCursor,
  });
}

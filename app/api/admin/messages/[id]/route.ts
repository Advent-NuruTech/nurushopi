import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

/* ---------- Types ---------- */
interface FirestoreTimestamp {
  toDate?: () => Date;
  seconds?: number;
}

interface MessageDoc {
  id: string;
  threadId?: string;
  senderId?: string;
  recipientId?: string;
  participantIds?: string[];
  createdAt?: unknown;
  readAt?: unknown;
}

/* ---------- Participant check ---------- */
const isParticipant = (
  adminId: string,
  data: Record<string, unknown>
): boolean => {
  if (
    Array.isArray(data.participantIds) &&
    (data.participantIds as string[]).includes(adminId)
  ) {
    return true;
  }

  if (data.senderId === adminId) return true;
  if (data.recipientId === adminId) return true;

  return false;
};

/* ---------- Timestamp safe conversion ---------- */
const toMillis = (value: unknown): number => {
  if (!value) return 0;

  if (typeof value === "number") return value;

  if (typeof value === "string") {
    return new Date(value).getTime();
  }

  if (typeof value === "object" && value !== null) {
    const ts = value as FirestoreTimestamp;

    if (typeof ts.toDate === "function") {
      return ts.toDate().getTime();
    }

    if (typeof ts.seconds === "number") {
      return ts.seconds * 1000;
    }
  }

  return 0;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;
    if (!id)
      return NextResponse.json(
        { error: "Thread ID required" },
        { status: 400 }
      );

    let threadId = id;

    let snap = await getDocs(
      query(
        collection(db, "messages"),
        where("threadId", "==", threadId),
        orderBy("createdAt", "asc")
      )
    );

    /* ---------- Fallback: treat id as messageId ---------- */
    if (snap.empty) {
      const msgSnap = await getDoc(doc(db, "messages", id));

      if (!msgSnap.exists()) {
        return NextResponse.json(
          { error: "Message not found" },
          { status: 404 }
        );
      }

      const msg = msgSnap.data() as Record<string, unknown>;

      if (!isParticipant(admin.adminId, msg)) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }

      const msgThreadId = (msg.threadId as string) || id;

      if (!msg.threadId) {
        return NextResponse.json({
          messages: [{ id: msgSnap.id, ...msg }],
          threadId: msgThreadId,
        });
      }

      threadId = msgThreadId;

      snap = await getDocs(
        query(
          collection(db, "messages"),
          where("threadId", "==", threadId),
          orderBy("createdAt", "asc")
        )
      );
    }

    /* ---------- Map docs safely ---------- */
    let messages: MessageDoc[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Record<string, unknown>),
    }));

    if (
      !messages.some((m) =>
        isParticipant(admin.adminId, m as unknown as Record<string, unknown>)
      )
    ) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    /* ---------- Ensure base message exists ---------- */
    const baseSnap = await getDoc(doc(db, "messages", threadId));

    if (baseSnap.exists()) {
      const base = baseSnap.data() as Record<string, unknown>;

      const baseThreadId = base.threadId as string | undefined;

      if (
        (!baseThreadId || baseThreadId === threadId) &&
        isParticipant(admin.adminId, base)
      ) {
        if (!messages.some((m) => m.id === baseSnap.id)) {
          messages = [
            ...messages,
            { id: baseSnap.id, ...base },
          ].sort(
            (a, b) =>
              toMillis(a.createdAt) -
              toMillis(b.createdAt)
          );
        }
      }
    }

    return NextResponse.json({ messages, threadId });
  } catch (e) {
    console.error("Failed to fetch thread messages:", e);

    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminFromRequest(request);
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;

    if (!id)
      return NextResponse.json(
        { error: "Message ID required" },
        { status: 400 }
      );

    const ref = doc(db, "messages", id);
    const snap = await getDoc(ref);

    if (!snap.exists())
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );

    const data = snap.data() as Record<string, unknown>;

    if (data.recipientId !== admin.adminId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await updateDoc(ref, {
      readAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Failed to mark message as read:", e);

    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    );
  }
}

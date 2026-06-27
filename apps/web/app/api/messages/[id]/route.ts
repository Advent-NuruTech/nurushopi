import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  doc,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  serverTimestamp,
  addDoc,
  updateDoc,
  FirestoreDataConverter,
} from "firebase/firestore";

/* ---------- Firestore timestamp type ---------- */
interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
}

/* ---------- Message Type ---------- */
export interface MessageItem {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  content: string;
  participantIds: string[];
  createdAt?: FirestoreTimestamp | number | string;
  readAt?: FirestoreTimestamp | number | string | null;
}

/* ---------- GET messages ---------- */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Thread ID required" }, { status: 400 });
  }

  try {
    const snap = await getDocs(
      query(
        collection(db, "messages"),
        where("threadId", "==", id),
        orderBy("createdAt", "asc")
      )
    );

    const messages: MessageItem[] = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        threadId: data.threadId as string,
        senderId: data.senderId as string,
        senderName: data.senderName as string,
        recipientId: data.recipientId as string,
        content: data.content as string,
        participantIds: data.participantIds as string[],
        createdAt: data.createdAt,
        readAt: data.readAt ?? null,
      };
    });

    return NextResponse.json({ messages, threadId: id });
  } catch (err) {
    console.error("Failed to fetch messages:", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

/* ---------- POST message ---------- */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const body = (await req.json()) as Partial<MessageItem>;
    const { senderId, senderName, recipientId, content } = body;

    if (!senderId || !recipientId || !content) {
      return NextResponse.json(
        { error: "senderId, recipientId, and content are required" },
        { status: 400 }
      );
    }

    const docRef = await addDoc(collection(db, "messages"), {
      threadId: id,
      senderId,
      senderName,
      recipientId,
      content,
      participantIds: [senderId, recipientId],
      readAt: null,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (err) {
    console.error("Failed to send message:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

/* ---------- PUT mark message read ---------- */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;

  try {
    const body = (await req.json()) as { userId?: string };
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const ref = doc(db, "messages", id);
    await updateDoc(ref, { readAt: serverTimestamp() });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to mark message read:", err);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }
}

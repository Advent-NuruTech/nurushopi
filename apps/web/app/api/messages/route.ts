import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  addDoc,
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

type UserMessagePayload = {
  userId?: string;
  senderName?: string;
  content?: string;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const snap = await getDocs(
      query(
        collection(db, "messages"),
        where("participantIds", "array-contains", userId),
        orderBy("createdAt", "desc")
      )
    );
    const messages = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
    return NextResponse.json({ messages });
  } catch (e) {
    console.error("Messages list error:", e);
    return NextResponse.json({ error: "Failed to list messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UserMessagePayload;
    const userId = String(body.userId ?? "");
    const content = String(body.content ?? "").trim();
    if (!userId || !content) {
      return NextResponse.json({ error: "userId and content required" }, { status: 400 });
    }

    const seniorsSnap = await getDocs(
      query(collection(db, "admins"), where("role", "==", "senior"))
    );
    if (seniorsSnap.empty) {
      return NextResponse.json({ error: "No senior admin available" }, { status: 400 });
    }
    const senior = seniorsSnap.docs[0];
    const seniorData = senior.data();
    const threadId = `thread-user-${userId}-admin-${senior.id}`;

    const senderName =
      String(body.senderName ?? "").trim() || "User";

    const docRef = await addDoc(collection(db, "messages"), {
      threadId,
      senderType: "user",
      senderId: userId,
      senderName,
      recipientType: "admin",
      recipientId: senior.id,
      recipientName: seniorData.name ?? "Senior Admin",
      recipientRole: "senior",
      content,
      participantIds: [userId, senior.id],
      readAt: null,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(db, "notifications"), {
      recipientType: "admin",
      recipientId: senior.id,
      type: "message",
      title: "New user message",
      body: content.slice(0, 120),
      relatedId: docRef.id,
      readAt: null,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: docRef.id, threadId });
  } catch (e) {
    console.error("Message send error:", e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; userId?: string };
    const id = body.id;
    const userId = body.userId;
    if (!id || !userId) {
      return NextResponse.json({ error: "id and userId required" }, { status: 400 });
    }

    const ref = doc(db, "messages", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return NextResponse.json({ error: "Message not found" }, { status: 404 });
    const data = snap.data();
    if (data.recipientId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await updateDoc(ref, { readAt: serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Message read error:", e);
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}

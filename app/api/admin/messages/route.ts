import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getAdminFromRequest } from "@/lib/adminAuth";

type AdminMessagePayload = {
  recipientType?: "admin" | "user";
  recipientId?: string;
  content?: string;
  threadId?: string;
};

type AdminRecord = {
  id: string;
  name: string;
  role: "senior" | "sub";
};

const isParticipant = (adminId: string, data: Record<string, unknown>): boolean => {
  if (Array.isArray(data.participantIds) && (data.participantIds as string[]).includes(adminId)) {
    return true;
  }
  if (data.senderId === adminId) return true;
  if (data.recipientId === adminId) return true;
  return false;
};

const buildAdminThreadId = (a: string, b: string): string => {
  const [x, y] = [a, b].sort();
  return `thread-admin-${x}-${y}`;
};

const buildUserThreadId = (userId: string, adminId: string): string =>
  `thread-user-${userId}-admin-${adminId}`;

const getAdminRecord = async (adminId: string): Promise<AdminRecord | null> => {
  const snap = await getDoc(doc(db, "admins", adminId));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return {
    id: snap.id,
    name: (data.name as string) || "Admin",
    role: ((data.role as string) || "sub") as AdminRecord["role"],
  };
};

const getUserName = async (userId: string): Promise<string | null> => {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return (
    (data.fullName as string) ||
    (data.name as string) ||
    (data.email as string) ||
    "User"
  );
};

const resolveRecipientFromThread = async (
  threadId: string,
  adminId: string
): Promise<{
  threadId: string;
  recipientId?: string;
  recipientType?: "admin" | "user";
  recipientName?: string;
} | null> => {
  const threadSnap = await getDocs(
    query(
      collection(db, "messages"),
      where("threadId", "==", threadId),
      orderBy("createdAt", "desc"),
      limit(1)
    )
  );

  if (!threadSnap.empty) {
    const last = threadSnap.docs[0]?.data() as Record<string, unknown>;
    const lastParticipants = Array.isArray(last.participantIds)
      ? (last.participantIds as string[])
      : [last.senderId, last.recipientId].filter(Boolean);
    if (!lastParticipants.includes(adminId)) {
      return null;
    }
    const participants = Array.isArray(last.participantIds)
      ? (last.participantIds as string[])
      : [last.senderId, last.recipientId].filter(Boolean);
    const otherId =
      participants.find((p) => p && p !== adminId) ??
      (last.senderId === adminId ? (last.recipientId as string) : (last.senderId as string));

    const recipientId = (otherId as string) || undefined;
    const recipientType =
      last.senderId === otherId 
        ? (last.senderType as "admin" | "user" | undefined) 
        : (last.recipientType as "admin" | "user" | undefined);
    const recipientName =
      last.senderId === otherId 
        ? (last.senderName as string | undefined) 
        : (last.recipientName as string | undefined);

    return { 
      threadId, 
      recipientId, 
      recipientType, 
      recipientName 
    };
  }

  const messageSnap = await getDoc(doc(db, "messages", threadId));
  if (!messageSnap.exists()) return null;

  const msg = messageSnap.data() as Record<string, unknown>;
  if (!isParticipant(adminId, msg)) {
    return null;
  }
  const resolvedThreadId = (msg.threadId as string) || threadId;
  const senderId = msg.senderId as string | undefined;
  const recipientId = msg.recipientId as string | undefined;
  const otherId = senderId === adminId ? recipientId : senderId;
  const recipientType =
    senderId === adminId 
      ? (msg.recipientType as "admin" | "user" | undefined) 
      : (msg.senderType as "admin" | "user" | undefined);
  const recipientName =
    senderId === adminId 
      ? (msg.recipientName as string | undefined) 
      : (msg.senderName as string | undefined);

  return {
    threadId: resolvedThreadId,
    recipientId: otherId,
    recipientType,
    recipientName,
  };
};

/* ---------- GET: list messages for current admin ---------- */
export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snap = await getDocs(
      query(
        collection(db, "messages"),
        where("participantIds", "array-contains", admin.adminId),
        orderBy("createdAt", "desc")
      )
    );
    const messages = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
    return NextResponse.json({ messages });
  } catch (e) {
    console.error("Admin messages list error:", e);
    return NextResponse.json({ error: "Failed to list messages" }, { status: 500 });
  }
}

/* ---------- POST: send new message or reply ---------- */
export async function POST(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as AdminMessagePayload;
    const content = String(body.content ?? "").trim();
    if (!content) {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }

    let threadId = String(body.threadId ?? "").trim() || "";
    let recipientId = String(body.recipientId ?? "").trim();
    let recipientType = body.recipientType;
    let recipientName = "";
    let recipientRole: AdminRecord["role"] | undefined;

    if (threadId) {
      const resolved = await resolveRecipientFromThread(threadId, admin.adminId);
      if (!resolved) {
        return NextResponse.json({ error: "Thread not found" }, { status: 404 });
      }
      if (!resolved.recipientId) {
        return NextResponse.json({ error: "Recipient not found in thread" }, { status: 404 });
      }
      threadId = resolved.threadId;
      recipientId = resolved.recipientId;
      recipientType = resolved.recipientType ?? recipientType;
      recipientName = resolved.recipientName ?? recipientName;
    }

    if (!recipientId) {
      return NextResponse.json({ error: "recipientId required" }, { status: 400 });
    }
    if (recipientId === admin.adminId) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    if (!recipientType) {
      const asAdmin = await getAdminRecord(recipientId);
      recipientType = asAdmin ? "admin" : "user";
    }

    if (recipientType === "admin") {
      const recipientAdmin = await getAdminRecord(recipientId);
      if (!recipientAdmin) {
        return NextResponse.json({ error: "Recipient admin not found" }, { status: 404 });
      }
      if (admin.role === "sub" && recipientAdmin.role !== "senior") {
        return NextResponse.json({ error: "Sub admins can only message senior admins" }, { status: 403 });
      }
      recipientName = recipientName || recipientAdmin.name;
      recipientRole = recipientAdmin.role;
      if (!threadId) {
        threadId = buildAdminThreadId(admin.adminId, recipientId);
      }
    } else if (recipientType === "user") {
      if (admin.role !== "senior") {
        return NextResponse.json({ error: "Sub admins cannot message users" }, { status: 403 });
      }
      const userName = await getUserName(recipientId);
      if (!userName) {
        return NextResponse.json({ error: "Recipient user not found" }, { status: 404 });
      }
      recipientName = recipientName || userName;
      if (!threadId) {
        threadId = buildUserThreadId(recipientId, admin.adminId);
      }
    } else {
      return NextResponse.json({ error: "Invalid recipientType" }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      threadId,
      senderType: "admin",
      senderId: admin.adminId,
      senderName: admin.name || "Admin",
      senderRole: admin.role,
      recipientType,
      recipientId,
      recipientName,
      content,
      participantIds: [admin.adminId, recipientId],
      readAt: null,
      createdAt: serverTimestamp(),
    };
    if (recipientRole) payload.recipientRole = recipientRole;

    const docRef = await addDoc(collection(db, "messages"), payload);

    if (recipientType === "admin") {
      await addDoc(collection(db, "notifications"), {
        recipientType: "admin",
        recipientId,
        type: "message",
        title: `New message from ${admin.name || "Admin"}`,
        body: content.slice(0, 120),
        relatedId: docRef.id,
        readAt: null,
        createdAt: serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true, id: docRef.id, threadId });
  } catch (e) {
    console.error("Admin message send error:", e);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

/* ---------- PUT: mark message(s) as read ---------- */
export async function PUT(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as { id?: string; ids?: string[] };
    const ids = body.ids ?? (body.id ? [body.id] : []);
    if (!ids.length) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    await Promise.all(
      ids.map(async (id) => {
        const ref = doc(db, "messages", id);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;
        if (data.recipientId !== admin.adminId) return;
        await updateDoc(ref, { readAt: serverTimestamp() });
      })
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Admin message read error:", e);
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }
}
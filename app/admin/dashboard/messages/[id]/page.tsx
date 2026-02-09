"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Send, MessageSquare } from "lucide-react";

/* ---------- Message Type ---------- */
interface MessageItem {
  id: string;
  threadId?: string;
  senderId?: string;
  senderName?: string;
  senderPhotoURL?: string;
  senderType?: string;
  recipientId?: string;
  recipientName?: string;
  recipientType?: string;
  content?: string;
  createdAt?: unknown;
  readAt?: unknown;
}

/* ---------- Safe Date Conversion ---------- */
const toDisplayDate = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number")
    return new Date(value).toLocaleString();
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  )
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: number }).seconds === "number"
  )
    return new Date((value as { seconds: number }).seconds * 1000).toLocaleString();
  return "";
};

export default function MessageDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [adminId, setAdminId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ---------- Load messages ---------- */
  const loadMessages = useCallback(async () => {
    if (!id || !adminId) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/messages/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch messages");

      const data: { messages: MessageItem[] } = await res.json();
      setMessages(data.messages ?? []);

      const unreadIncoming = data.messages?.filter(
        (m) => m.recipientId === adminId && !m.readAt
      );

      if (unreadIncoming?.length) {
        const ids = unreadIncoming.map((m) => m.id);
        await fetch(`/api/admin/messages`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [id, adminId]);

  /* ---------- Admin auth ---------- */
  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/me", { credentials: "include" })
      .then((r) => {
        if (cancelled) return null;
        if (r.status === 401) {
          router.replace("/admin/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!cancelled && data?.admin?.adminId) setAdminId(data.admin.adminId);
      })
      .finally(() => !cancelled && setAuthLoading(false));

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  /* ---------- Auto scroll ---------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------- Send reply ---------- */
  const sendReply = async () => {
    if (!reply.trim() || !adminId || !id) return;

    const text = reply.trim();
    setReply("");

    try {
      await fetch("/api/admin/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: id,
          content: text,
        }),
      });
      await loadMessages();
      textareaRef.current?.focus();
    } catch (err) {
      console.error("Failed to send reply:", err);
    }
  };

  if (authLoading || loading) return <LoadingSpinner text="Loading messages..." />;

  if (!messages.length)
    return <p className="p-6 text-center text-slate-500">No messages found.</p>;

  return (
    <section className="fixed inset-0 bg-white dark:bg-gray-800 flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
        <div className="flex gap-3 items-center">
          <MessageSquare size={24} />
          <div>
            <h2 className="text-lg font-bold">Conversation</h2>
            <p className="text-sm text-gray-500">Admin chat view</p>
          </div>
        </div>

        <button
          onClick={() => router.push("/admin/dashboard/messages")}
          className="text-sm text-sky-600 dark:text-sky-400 hover:underline"
        >
          Back
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-800 flex flex-col">
        {messages.map((m) => {
          const incoming = m.recipientId === adminId;

          return (
            <div
              key={m.id}
              className={`max-w-[75%] flex flex-col ${incoming ? "self-start" : "self-end"}`}
            >
              <div
                className={`p-3 rounded-xl break-words ${
                  incoming ? "bg-gray-200 dark:bg-gray-700" : "bg-blue-600 text-white"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>

              <span
                className={`text-xs mt-1 px-1 ${incoming ? "text-gray-500 self-start" : "text-gray-300 self-end"}`}
              >
                {toDisplayDate(m.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input */}
      <div className="border-t p-3 bg-gray-50 dark:bg-gray-900">
        <div className="flex gap-2 items-center w-full">
          <textarea
            ref={textareaRef}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={1}
            placeholder="Reply..."
            className="flex-1 border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
          />

          <button
            onClick={sendReply}
            disabled={!reply.trim()}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </section>
  );
}

"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useRouter } from "next/navigation";
import { Send, Bell, MessageSquare, X } from "lucide-react";

interface FirestoreTimestamp {
  toDate?: () => Date;
  seconds?: number;
}

interface MessageItem {
  id: string;
  senderId?: string;
  senderName?: string;
  recipientId?: string;
  recipientName?: string;
  content?: string;
  createdAt?: unknown;
  readAt?: unknown;
}

const toDisplayDate = (value: unknown): string => {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).toLocaleString();
  }

  if (typeof value === "object" && value !== null) {
    const ts = value as FirestoreTimestamp;

    if (typeof ts.toDate === "function") {
      return ts.toDate().toLocaleString();
    }

    if (typeof ts.seconds === "number") {
      return new Date(ts.seconds * 1000).toLocaleString();
    }
  }

  return "";
};

/* ---------- Timestamp to ms ---------- */
const timestampToMs = (value: unknown): number => {
  if (!value) return 0;

  if (typeof value === "string" || typeof value === "number") {
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

export default function MessagesPanel({
  userId,
  displayName,
  onUnreadChange,
  onClose,
}: {
  userId: string;
  displayName: string;
  onUnreadChange?: (count: number) => void;
  onClose?: () => void;
}) {
  const router = useRouter();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ---------- Mark read ---------- */
  const markRead = useCallback(
    async (id: string) => {
      await fetch("/api/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, userId }),
      });
    },
    [userId]
  );

  /* ---------- Load messages ---------- */
  const load = useCallback(
    async (showLoading = true) => {
      if (!userId) return;
      if (showLoading) setLoading(true);

      try {
        const res = await fetch(
          `/api/messages?userId=${encodeURIComponent(userId)}`
        );

        if (!res.ok) throw new Error("Fetch failed");

        const data = await res.json();
        const serverMessages: MessageItem[] = data.messages ?? [];

        const sorted = [...serverMessages].sort(
          (a, b) =>
            timestampToMs(a.createdAt) -
            timestampToMs(b.createdAt)
        );

        setMessages(sorted);

        const unreadMessages = sorted.filter(
          (m) => m.recipientId === userId && !m.readAt
        );

        unreadMessages.forEach((m) => markRead(m.id));

        onUnreadChange?.(0);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [userId, onUnreadChange, markRead]
  );

  useEffect(() => {
    load();
    const interval = setInterval(() => load(false), 30000);
    return () => clearInterval(interval);
  }, [load]);

  /* ---------- Auto scroll ---------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------- Send message ---------- */
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const text = content.trim();
    setSending(true);
    setContent("");

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        senderName: displayName,
        content: text,
      }),
    });

    await load(false);
    setSending(false);
  };

  /* ---------- Handle close ---------- */
  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }

    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/profile");
    }
  };

  if (loading) return <LoadingSpinner text="Loading messages..." />;

  return (
    <section className="fixed top-0 right-0 h-full w-full md:w-[420px] bg-white dark:bg-gray-800 shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
        <div className="flex gap-3 items-center">
          <MessageSquare size={24} />
          <div>
            <h2 className="text-lg font-bold">Customer Support</h2>
            <p className="text-sm text-gray-500">
              Chat with Senior Admin Team
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Bell size={18} />

          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-800 flex flex-col">
        {messages.map((m) => {
          const incoming = m.recipientId === userId;

          return (
            <div
              key={m.id}
              className={`max-w-[75%] flex flex-col ${
                incoming ? "self-start" : "self-end"
              }`}
            >
              <div
                className={`p-3 rounded-xl break-words ${
                  incoming
                    ? "bg-gray-200 dark:bg-gray-700"
                    : "bg-blue-600 text-white"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>

              <span
                className={`text-xs mt-1 px-1 ${
                  incoming
                    ? "text-gray-500 self-start"
                    : "text-gray-400 self-end"
                }`}
              >
                {toDisplayDate(m.createdAt)}
              </span>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 bg-gray-50 dark:bg-gray-900">
        <form
          onSubmit={sendMessage}
          className="flex gap-2 items-center w-full"
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={1}
            disabled={sending}
            placeholder="Message..."
            className="flex-1 border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
          />

          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </section>
  );
}

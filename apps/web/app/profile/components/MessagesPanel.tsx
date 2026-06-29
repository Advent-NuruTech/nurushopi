"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useRouter } from "next/navigation";
import { Send, Bell, MessageSquare, X } from "lucide-react";
import { messagesApi } from "@/lib/api";
import type { MessageDTO } from "@nuru/types";

const toDisplayDate = (value: string): string =>
  value ? new Date(value).toLocaleString() : "";

export default function MessagesPanel({
  userId,
  onUnreadChange,
  onClose,
}: {
  userId: string;
  displayName?: string;
  onUnreadChange?: (count: number) => void;
  onClose?: () => void;
}) {
  const router = useRouter();

  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ---------- Load messages ---------- */
  const load = useCallback(
    async (showLoading = true) => {
      if (!userId) return;
      if (showLoading) setLoading(true);
      try {
        // The thread is keyed by the signed-in user server-side; listing also
        // auto-marks inbound (admin) messages as read.
        const { messages: rows } = await messagesApi.list();
        setMessages(rows);
        onUnreadChange?.(0);
      } catch {
        /* keep whatever we had on a transient failure */
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [userId, onUnreadChange]
  );

  useEffect(() => {
    void load();
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
    try {
      await messagesApi.send({ body: text, attachments: [] });
      await load(false);
    } finally {
      setSending(false);
    }
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
    <section className="fixed top-0 right-0 h-full w-full md:w-[420px] bg-white dark:bg-gray-800 shadow-xl flex flex-col z-[60] pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
        <div className="flex gap-3 items-center">
          <MessageSquare size={24} />
          <div>
            <h2 className="text-lg font-bold">Customer Support</h2>
            <p className="text-sm text-gray-500">Chat with Senior Admin Team</p>
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
          const incoming = m.senderType === "ADMIN";

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
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>

              <span
                className={`text-xs mt-1 px-1 ${
                  incoming ? "text-gray-500 self-start" : "text-gray-400 self-end"
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
        <form onSubmit={sendMessage} className="flex gap-2 items-center w-full">
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

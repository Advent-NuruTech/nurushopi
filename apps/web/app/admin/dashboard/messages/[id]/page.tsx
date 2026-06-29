"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Send, MessageSquare } from "lucide-react";
import { ADMIN_DASHBOARD_PATH, adminRoute } from "@/lib/adminPaths";
import { messagesApi, ApiClientError } from "@/lib/api";
import type { MessageDTO } from "@nuru/types";

export default function MessageDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const threadId = Array.isArray(id) ? id[0] : id;

  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ---------- Load thread ---------- */
  const loadMessages = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      const { messages: msgs } = await messagesApi.admin.listThread(threadId);
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  /* ---------- Auto scroll ---------- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------- Send reply ---------- */
  const sendReply = async () => {
    if (!reply.trim() || !threadId) return;
    const body = reply.trim();
    setReply("");
    try {
      await messagesApi.admin.reply(threadId, { body, attachments: [] });
      await loadMessages();
      textareaRef.current?.focus();
    } catch (err) {
      if (err instanceof ApiClientError) alert(err.message);
    }
  };

  if (loading) return <LoadingSpinner text="Loading messages..." />;

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
            <p className="text-sm text-gray-500">Customer support thread</p>
          </div>
        </div>

        <button
          onClick={() => router.push(adminRoute(`${ADMIN_DASHBOARD_PATH}/messages`))}
          className="text-sm text-sky-600 dark:text-sky-400 hover:underline"
        >
          Back
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-800 flex flex-col">
        {messages.map((m) => {
          const incoming = m.senderType === "USER";

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
                  incoming ? "text-gray-500 self-start" : "text-gray-300 self-end"
                }`}
              >
                {new Date(m.createdAt).toLocaleString()}
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

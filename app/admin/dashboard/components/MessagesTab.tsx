"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { AdminRole } from "./types";
import { useNotifications } from "../context/NotificationsContext"; // <-- import context

interface MessagesTabProps {
  adminId: string;
  role: AdminRole;
}

interface MessageItem {
  id: string;
  threadId?: string;
  senderId?: string;
  senderName?: string;
  senderType?: string;
  recipientId?: string;
  recipientName?: string;
  recipientType?: string;
  content?: string;
  createdAt?: unknown;
  readAt?: unknown;
}

interface AdminRecipient {
  adminId: string;
  name: string;
  role: string;
}

interface UserRecipient {
  id: string;
  name: string;
  email?: string;
}

const toDisplayDate = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "string") return new Date(value).toLocaleString();
  if (typeof value === "number") return new Date(value).toLocaleString();
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  }
  if (typeof (value as { seconds?: number }).seconds === "number") {
    return new Date((value as { seconds: number }).seconds * 1000).toLocaleString();
  }
  return "";
};

export default function MessagesTab({ adminId, role }: MessagesTabProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [recipientType, setRecipientType] = useState<"admin" | "user">("admin");
  const [recipientId, setRecipientId] = useState("");
  const [content, setContent] = useState("");
  const [admins, setAdmins] = useState<AdminRecipient[]>([]);
  const [users, setUsers] = useState<UserRecipient[]>([]);

  const { loadNotifications } = useNotifications(); // <-- access notification updater

  const loadMessages = () => {
    setLoading(true);
    fetch("/api/admin/messages", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    fetch("/api/admin/admins", { credentials: "include" })
      .then((r) => r.json())
      .then((d) =>
        setAdmins((d.admins ?? []).filter((a: AdminRecipient) => a.adminId !== adminId))
      )
      .catch(() => setAdmins([]));

    if (role === "senior") {
      fetch("/api/admin/users", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setUsers(d.users ?? []))
        .catch(() => setUsers([]));
    } else {
      setUsers([]);
    }
  }, [adminId, role]);

  useEffect(() => {
    if (role === "sub" && recipientType !== "admin") {
      setRecipientType("admin");
    }
    const list = recipientType === "admin" ? admins : users;
    if (!recipientId && list.length) {
      const id = "adminId" in list[0] ? list[0].adminId : list[0].id;
      setRecipientId(id);
    }
  }, [admins, users, recipientType, recipientId, role]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return messages;
    return messages.filter((m) =>
      `${m.senderName ?? ""} ${m.recipientName ?? ""} ${m.content ?? ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [messages, query]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId || !content.trim()) return;

    const res = await fetch("/api/admin/messages", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientType,
        recipientId,
        content,
      }),
    });

    if (res.ok) {
      setContent("");
      loadMessages();
      loadNotifications(); // <-- update notifications automatically
    }
  };

  const markRead = async (id: string) => {
    const res = await fetch("/api/admin/messages", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, readAt: new Date().toISOString() } : m))
      );
      loadNotifications(); // <-- also update notifications
    }
  };

  if (loading) return <LoadingSpinner text="Loading messages..." />;

  const unreadCount = messages.filter((m) => m.recipientId === adminId && !m.readAt).length;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Messages</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {unreadCount > 0
            ? `${unreadCount} unread message${unreadCount === 1 ? "" : "s"}.`
            : "No unread messages."}
        </p>
      </div>

      {/* Send Message Form */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <form onSubmit={sendMessage} className="grid gap-3 sm:grid-cols-4">
          <select
            value={recipientType}
            onChange={(e) => setRecipientType(e.target.value as "admin" | "user")}
            disabled={role === "sub"}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="admin">Admin</option>
            {role === "senior" && <option value="user">User</option>}
          </select>
          <select
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            {(recipientType === "admin" ? admins : users).map((r) => (
              <option key={"adminId" in r ? r.adminId : r.id} value={"adminId" in r ? r.adminId : r.id}>
                {"adminId" in r ? `${r.name} (${r.role})` : r.name}
              </option>
            ))}
          </select>
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message..."
            className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={!content.trim() || !recipientId}
            className="sm:col-span-4 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium"
          >
            Send Message
          </button>
        </form>
        {role === "sub" && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Sub Admins can message Senior Admins only.
          </p>
        )}
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <input
          placeholder="Search messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        />
      </div>

      {/* Messages List */}
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {filtered.length === 0 ? (
          <p className="p-6 text-slate-500 dark:text-slate-400 text-center">No messages yet.</p>
        ) : (
          filtered.map((m) => {
            const isIncoming = m.recipientId === adminId;
            return (
              <Link
                key={m.id}
                href={`/admin/dashboard/messages/${m.threadId ?? m.id}`}
                className={`block p-4 flex flex-col gap-2 rounded-lg border-b last:border-b-0 ${
                  !m.readAt && isIncoming ? "bg-slate-50 dark:bg-slate-800/70" : "bg-white dark:bg-slate-900"
                } hover:bg-slate-100 dark:hover:bg-slate-800/80`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {isIncoming ? `From ${m.senderName ?? "Unknown"}` : `To ${m.recipientName ?? "Unknown"}`}
                  </span>
                  <span className="text-xs text-slate-400">{toDisplayDate(m.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap truncate">{m.content}</p>
                {isIncoming && (
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {!m.readAt ? <span className="text-sky-600 dark:text-sky-400">Unread</span> : <span>Read</span>}
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}

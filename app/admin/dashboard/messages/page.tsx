"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useNotifications } from "../context/NotificationsContext";
import { Search, MessageSquare } from "lucide-react";

interface FirestoreTimestamp {
  toDate?: () => Date;
  seconds?: number;
}

interface MessageItem {
  id: string;
  threadId?: string;
  senderId?: string;
  senderName?: string;
  senderPhotoURL?: string;
  recipientId?: string;
  recipientName?: string;
  content?: string;
  createdAt?: unknown;
  readAt?: unknown;
}

/* ---------- Safe date ---------- */
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

/* ---------- Avatar ---------- */
function Avatar({
  name,
  photoURL,
}: {
  name?: string;
  photoURL?: string;
}) {
  if (photoURL) {
    return (
      <Image
        src={photoURL}
        alt={name ?? "User avatar"}
        width={44}
        height={44}
        className="w-11 h-11 rounded-full object-cover"
      />
    );
  }

  const letter = name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="w-11 h-11 rounded-full bg-sky-600 text-white flex items-center justify-center font-semibold">
      {letter}
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();

  const [adminId, setAdminId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Cache user photos
  const [userPhotos, setUserPhotos] = useState<Record<string, string>>({});

  const { loadNotifications } = useNotifications();

  /* ---------- Load messages ---------- */
  const loadMessages = () => {
    setLoading(true);

    fetch("/api/admin/messages", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setMessages(data.messages ?? []))
      .finally(() => setLoading(false));
  };

  /* ---------- Load admin ---------- */
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
        if (cancelled || !data?.admin?.adminId) return;
        setAdminId(data.admin.adminId);
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (adminId) loadMessages();
  }, [adminId]);

  /* ---------- Fetch user profile photos ---------- */
  useEffect(() => {
    const userIds = new Set<string>();

    messages.forEach((m) => {
      if (m.senderId && !m.senderPhotoURL) {
        userIds.add(m.senderId);
      }
    });

    userIds.forEach(async (id) => {
      if (userPhotos[id]) return;

      try {
        const res = await fetch(`/api/users/${id}`);
        if (!res.ok) return;

        const data = await res.json();

        if (data?.photoURL) {
          setUserPhotos((prev) => ({
            ...prev,
            [id]: data.photoURL,
          }));
        }
      } catch {
        /* silent */
      }
    });
  }, [messages, userPhotos]);

  /* ---------- Mark read ---------- */
  const markRead = async (id: string) => {
    const res = await fetch(`/api/admin/messages/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, readAt: new Date().toISOString() } : m
        )
      );
      loadNotifications();
    }
  };

  /* ---------- Search ---------- */
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return messages;

    return messages.filter((m) =>
      `${m.senderName ?? ""} ${m.recipientName ?? ""} ${
        m.content ?? ""
      }`
        .toLowerCase()
        .includes(needle)
    );
  }, [messages, query]);

  if (authLoading || loading) {
    return <LoadingSpinner text="Loading messages..." />;
  }

  const unreadCount = adminId
    ? messages.filter((m) => m.recipientId === adminId && !m.readAt).length
    : 0;

  return (
    <section className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <MessageSquare size={26} />
          <div>
            <h1 className="text-xl font-bold">User Messages</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {unreadCount > 0
                ? `${unreadCount} unread message${
                    unreadCount === 1 ? "" : "s"
                  }`
                : "No unread messages"}
            </p>
          </div>
        </div>

        <div className="mt-3 relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            placeholder="Search messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.map((m) => {
          const isIncoming = adminId
            ? m.recipientId === adminId
            : false;

          const displayName = isIncoming
            ? m.senderName ?? "User"
            : m.recipientName ?? "User";

          const avatarPhoto =
            m.senderPhotoURL ||
            (m.senderId ? userPhotos[m.senderId] : undefined);

          const unread = isIncoming && !m.readAt;

          return (
            <Link
              key={m.id}
              href={`/admin/dashboard/messages/${m.threadId ?? m.id}`}
              onClick={() => unread && markRead(m.id)}
              className={`flex gap-3 items-start p-3 rounded-xl border transition shadow-sm ${
                unread
                  ? "bg-sky-50 dark:bg-slate-800/70"
                  : "bg-white dark:bg-slate-900"
              } hover:bg-sky-100 dark:hover:bg-slate-800`}
            >
              <Avatar name={displayName} photoURL={avatarPhoto} />

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-medium truncate">
                    {displayName}
                  </span>

                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {toDisplayDate(m.createdAt)}
                  </span>
                </div>

                <p className="text-sm truncate text-slate-600 dark:text-slate-300 mt-0.5">
                  {m.content}
                </p>

                {unread && (
                  <div className="mt-1">
                    <span className="text-xs text-sky-600 font-medium">
                      Unread
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Search, MessageSquare } from "lucide-react";
import { ADMIN_DASHBOARD_PATH, adminRoute } from "@/lib/adminPaths";
import { messagesApi } from "@/lib/api";
import type { MessageThreadDTO } from "@nuru/types";

/* ---------- Avatar ---------- */
function Avatar({ name }: { name?: string | null }) {
  const letter = name?.charAt(0)?.toUpperCase() ?? "?";
  return (
    <div className="w-11 h-11 rounded-full bg-sky-600 text-white flex items-center justify-center font-semibold">
      {letter}
    </div>
  );
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<MessageThreadDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    messagesApi.admin
      .listThreads({ pageSize: 100 })
      .then((page) => setThreads(page.items))
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return threads;
    return threads.filter((t) =>
      `${t.userName ?? ""} ${t.lastMessage ?? ""}`.toLowerCase().includes(needle)
    );
  }, [threads, query]);

  if (loading) return <LoadingSpinner text="Loading messages..." />;

  const unreadCount = threads.filter((t) => t.unreadCount > 0).length;

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
                ? `${unreadCount} thread${unreadCount === 1 ? "" : "s"} with unread messages`
                : "No unread messages"}
            </p>
          </div>
        </div>

        <div className="mt-3 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>
      </div>

      {/* Threads */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.map((t) => {
          const unread = t.unreadCount > 0;
          return (
            <Link
              key={t.threadId}
              href={adminRoute(`${ADMIN_DASHBOARD_PATH}/messages/${t.threadId}`)}
              className={`flex gap-3 items-start p-3 rounded-xl border transition shadow-sm ${
                unread ? "bg-sky-50 dark:bg-slate-800/70" : "bg-white dark:bg-slate-900"
              } hover:bg-sky-100 dark:hover:bg-slate-800`}
            >
              <Avatar name={t.userName} />

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-medium truncate">{t.userName ?? "Customer"}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(t.lastMessageAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-sm truncate text-slate-600 dark:text-slate-300 mt-0.5">
                  {t.lastMessage}
                </p>

                {unread && (
                  <div className="mt-1">
                    <span className="text-xs text-sky-600 font-medium">
                      {t.unreadCount} unread
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

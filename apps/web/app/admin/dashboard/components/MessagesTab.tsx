"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { AdminRole } from "./types";
import { messagesApi } from "@/lib/api";
import type { MessageThreadDTO } from "@nuru/types";
import { ADMIN_DASHBOARD_PATH, adminRoute } from "@/lib/adminPaths";

interface MessagesTabProps {
  adminId: string;
  role: AdminRole;
}

export default function MessagesTab({}: MessagesTabProps) {
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

  const unreadThreads = threads.filter((t) => t.unreadCount > 0).length;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Support Messages</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {unreadThreads > 0
            ? `${unreadThreads} thread${unreadThreads === 1 ? "" : "s"} with unread messages.`
            : "No unread customer messages."}
        </p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <input
          placeholder="Search by customer or message..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
        />
      </div>

      {/* Threads */}
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {filtered.length === 0 ? (
          <p className="p-6 text-slate-500 dark:text-slate-400 text-center">No conversations yet.</p>
        ) : (
          filtered.map((t) => (
            <Link
              key={t.threadId}
              href={adminRoute(`${ADMIN_DASHBOARD_PATH}/messages/${t.threadId}`)}
              className={`block p-4 flex flex-col gap-1 ${
                t.unreadCount > 0 ? "bg-slate-50 dark:bg-slate-800/70" : "bg-white dark:bg-slate-900"
              } hover:bg-slate-100 dark:hover:bg-slate-800/80`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {t.userName ?? "Customer"}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(t.lastMessageAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{t.lastMessage}</p>
              {t.unreadCount > 0 && (
                <span className="text-xs text-sky-600 dark:text-sky-400">
                  {t.unreadCount} unread
                </span>
              )}
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

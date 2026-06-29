"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { NotificationDTO } from "@nuru/types";
import { notificationsApi } from "@/lib/api";
import { useAppUser } from "@/context/UserContext";

const POLL_INTERVAL_MS = 30_000;

function getNotificationRoute(item: NotificationDTO): string {
  if (item.type === "review_prompt") {
    const orderParam = item.relatedId ? `&orderId=${encodeURIComponent(item.relatedId)}` : "";
    return `/profile?tab=reviews${orderParam}`;
  }
  if (item.type === "message") return "/profile?tab=messages";
  if (item.type === "order_update") return "/profile?tab=orders";
  return "/profile";
}

export default function UserNotificationsBell() {
  const { user } = useAppUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const { items } = await notificationsApi.list({ pageSize: 30 });
      setNotifications(items);
    } catch {
      setNotifications([]);
    }
  }, []);

  // Poll the user's notifications while signed in.
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }
    void load();
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [user?.id, load]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (open && containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const unread = useMemo(() => notifications.filter((n) => !n.read), [notifications]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await notificationsApi.markRead(id);
    } catch {
      // Best-effort; a later poll will reconcile.
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationsApi.markAllRead();
    } catch {
      void load();
    }
  }, [load]);

  const handleItemClick = async (item: NotificationDTO) => {
    if (!item.read) await markRead(item.id);
    setOpen(false);
    router.push(getNotificationRoute(item) as Route);
  };

  if (!user?.id || unread.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 hover:text-blue-600"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs h-5 rounded-full flex items-center justify-center px-2 min-w-[20px]">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed md:absolute top-16 md:top-full right-2 md:right-0 left-2 md:left-auto md:mt-2 w-auto md:w-80 max-w-none md:max-w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-[70]">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="font-semibold text-slate-900 dark:text-white">Notifications</span>
            {unread.length > 0 && (
              <button
                type="button"
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
                onClick={markAllRead}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 dark:text-slate-400">No notifications yet.</p>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    item.read ? "bg-transparent" : "bg-sky-50/40 dark:bg-sky-900/10"
                  }`}
                >
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {item.title || "Notification"}
                  </p>
                  {item.body && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                      {item.body}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

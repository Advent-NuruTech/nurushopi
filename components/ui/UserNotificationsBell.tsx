"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  collection,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppUser } from "@/context/UserContext";

type NotificationItem = {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  relatedId?: string;
  recipientType?: string;
  readAt?: unknown;
  createdAt?: unknown;
};

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const dt = (value as { toDate?: () => Date }).toDate;
    return typeof dt === "function" ? dt().getTime() : 0;
  }
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const seconds = (value as { seconds?: number }).seconds;
    return typeof seconds === "number" ? seconds * 1000 : 0;
  }
  return 0;
}

function getNotificationRoute(item: NotificationItem): string {
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.id),
      limit(30)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationItem, "id">) }))
          .filter((n) => (n.recipientType ?? "user") === "user")
          .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
        setNotifications(list);
      },
      () => setNotifications([])
    );
  }, [user?.id]);

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

  const unread = useMemo(() => notifications.filter((n) => !n.readAt), [notifications]);

  const markRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { readAt: serverTimestamp() });
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.readAt) {
      await markRead(item.id);
    }
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
                onClick={async () => {
                  await Promise.all(unread.map((n) => markRead(n.id)));
                }}
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
                    item.readAt ? "bg-transparent" : "bg-sky-50/40 dark:bg-sky-900/10"
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

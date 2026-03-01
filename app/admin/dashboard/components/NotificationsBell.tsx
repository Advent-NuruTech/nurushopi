"use client";

import React, { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useNotifications } from "../context/NotificationsContext";

/* ---------- Notification Type ---------- */
interface NotificationItem {
  id: string;
  readAt?: unknown;
  relatedId?: string;
  type?: string;
  senderName?: string;
  userName?: string;
  title?: string;
  body?: string;
  createdAt?: unknown;
}

/* ---------- Safe Date Formatter ---------- */
const toDisplayDate = (value: unknown): string => {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).toLocaleString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: number }).seconds === "number"
  ) {
    return new Date(
      (value as { seconds: number }).seconds * 1000
    ).toLocaleString();
  }

  return "";
};

const getNotificationRoute = (n: NotificationItem): Route | null => {
  const encoded = n.relatedId ? encodeURIComponent(n.relatedId) : "";
  if (n.type === "order") {
    if (!n.relatedId) return null;
    return `/admin/dashboard?tab=orders&orderId=${encoded}` as Route;
  }
  if (n.type === "message") {
    if (!n.relatedId) return null;
    return `/admin/dashboard/messages/${encoded}` as Route;
  }
  if (n.type === "review") {
    if (!n.relatedId) return null;
    return `/admin/dashboard?tab=reviews&reviewId=${encoded}` as Route;
  }
  if (n.type === "wallet") {
    if (!n.relatedId) return null;
    return `/admin/dashboard?tab=redemptions&redemptionId=${encoded}` as Route;
  }
  if (n.type === "vendor_application") {
    return (n.relatedId
      ? `/admin/dashboard/vendors?applicationId=${encoded}`
      : "/admin/dashboard/vendors") as Route;
  }
  return `/admin/dashboard/notifications` as Route;
};

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);

  const {
    notifications,
    markRead,
    markAllRead,
    unreadCount,
  } = useNotifications();

  const router = useRouter();

  /* ---------- Only unread in dropdown ---------- */
  const visibleNotifications = useMemo(
    () =>
      (notifications as NotificationItem[]).filter((n) => !n.readAt),
    [notifications]
  );

  /* ---------- Click notification ---------- */
  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.readAt) await markRead(n.id);

    const route = getNotificationRoute(n);
    if (route) {
      router.push(route);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* ---------- Bell ---------- */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
        aria-label="Notifications"
      >
        <Bell size={18} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs h-[18px] rounded-full flex items-center justify-center px-2 min-w-[18px]">
  {unreadCount}
</span>
        )}
      </button>

      {/* ---------- Dropdown ---------- */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-900 dark:text-white">
              Notifications
            </span>

            <button
              type="button"
              onClick={markAllRead}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
            >
              Mark all read
            </button>
          </div>

          {/* Notifications */}
          <div className="max-h-80 overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
                No notifications.
              </p>
            ) : (
              visibleNotifications.map((n) => {
                const sender =
                  n.senderName ||
                  n.userName ||
                  n.title ||
                  "User";

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="px-4 py-3 border-b last:border-b-0 border-slate-100 dark:border-slate-800 cursor-pointer transition bg-slate-50 dark:bg-slate-800/70 hover:bg-sky-50 dark:hover:bg-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {sender}
                        </p>

                        {n.body && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {n.body}
                          </p>
                        )}

                        <p className="text-[11px] text-slate-400 mt-1">
                          {toDisplayDate(n.createdAt)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markRead(n.id);
                        }}
                        className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Mark read
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-center">
            <button
              onClick={() => {
                router.push("/admin/dashboard/notifications");
                setOpen(false);
              }}
              className="text-sm text-sky-600 dark:text-sky-400 hover:underline"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

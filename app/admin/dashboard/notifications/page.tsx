"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  title?: string;
  body?: string;
  type?: string;
  createdAt?: unknown;
  readAt?: unknown;
  relatedId?: string;
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const router = useRouter();

  const loadNotifications = () => {
    fetch("/api/admin/notifications", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setNotifications(data.notifications ?? []))
      .catch(() => setNotifications([]));
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleClick = async (notification: NotificationItem) => {
    // Mark as read if not already
    if (!notification.readAt) {
      await fetch("/api/admin/notifications", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification.id }),
      });
      loadNotifications();
    }

    // Navigate to the related message page if there is a relatedId
    if (notification.relatedId) {
      router.push(`/admin/dashboard/messages/${notification.relatedId}`);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">All Notifications</h1>
      {notifications.length === 0 ? (
        <p className="text-slate-500">No notifications available.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`cursor-pointer px-4 py-3 border rounded-lg transition ${
                n.readAt ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800/70"
              } hover:bg-sky-50 dark:hover:bg-slate-700`}
            >
              <p className="font-medium text-slate-900 dark:text-white">
                {n.title ?? "Notification"}
              </p>
              {n.body && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{n.body}</p>
              )}
              <p className="text-xs text-slate-400 mt-1">{toDisplayDate(n.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

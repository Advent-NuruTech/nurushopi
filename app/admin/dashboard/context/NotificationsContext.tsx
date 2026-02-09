// app/admin/dashboard/context/NotificationsContext.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface NotificationItem {
  id: string;
  title?: string;
  body?: string;
  type?: string;
  createdAt?: unknown;
  readAt?: unknown;
  relatedId?: string;
}

interface NotificationsContextType {
  notifications: NotificationItem[];
  loadNotifications: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  unreadCount: number;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadNotifications = () => {
    fetch("/api/admin/notifications", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => setNotifications([]));
  };

  const markRead = async (id: string) => {
    const res = await fetch("/api/admin/notifications", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    }
  };

  const markAllRead = async () => {
    const ids = notifications.filter((n) => !n.readAt).map((n) => n.id);
    if (!ids.length) return;

    const res = await fetch("/api/admin/notifications", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
      );
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <NotificationsContext.Provider value={{ notifications, loadNotifications, markRead, markAllRead, unreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
};

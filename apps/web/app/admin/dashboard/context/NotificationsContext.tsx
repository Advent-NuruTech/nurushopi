// app/admin/dashboard/context/NotificationsContext.tsx
"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { notificationsApi } from "@/lib/api";
import type { NotificationDTO } from "@nuru/types";

interface NotificationsContextType {
  notifications: NotificationDTO[];
  loadNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  unreadCount: number;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);

  const loadNotifications = useCallback(async () => {
    try {
      const page = await notificationsApi.admin.list({ pageSize: 100 });
      setNotifications(page.items);
    } catch {
      setNotifications([]);
    }
  }, []);

  const markRead = async (id: string) => {
    try {
      await notificationsApi.admin.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // ignore — the badge will resync on next load
    }
  };

  const markAllRead = async () => {
    if (!notifications.some((n) => !n.read)) return;
    try {
      await notificationsApi.admin.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadNotifications();
    // Light polling keeps the badge fresh without a websocket.
    const interval = setInterval(loadNotifications, 60_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

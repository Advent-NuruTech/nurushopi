// app/admin/dashboard/context/NotificationsContext.tsx
"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  loadNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  unreadCount: number;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [adminId, setAdminId] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/notifications", { credentials: "include" });
      if (!response.ok) {
        setNotifications([]);
        return;
      }
      const data = await response.json();
      setNotifications(data.notifications ?? []);
    } catch {
      setNotifications([]);
    }
  }, []);

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
    let cancelled = false;
    fetch("/api/admin/me", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        setAdminId(data?.admin?.adminId ?? null);
      })
      .catch(() => {
        if (!cancelled) setAdminId(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!adminId) {
      setNotifications([]);
      return;
    }

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("recipientType", "==", "admin"),
      where("recipientId", "==", adminId),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const next = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Record<string, unknown>),
        })) as NotificationItem[];
        setNotifications(next);
      },
      async () => {
        await loadNotifications();
      }
    );

    return () => unsubscribe();
  }, [adminId, loadNotifications]);

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

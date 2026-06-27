"use client";

import React from "react";
import { NotificationsProvider } from "./dashboard/context/NotificationsContext"; // Provider for real-time updates

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        {children}
      </div>
    </NotificationsProvider>
  );
}

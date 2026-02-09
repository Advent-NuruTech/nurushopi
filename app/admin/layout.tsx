"use client";

import React from "react";
import { NotificationsProvider } from "./dashboard/context/NotificationsContext"; // Provider for real-time updates
import NotificationsBell from "./dashboard/components/NotificationsBell"; // Bell component
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationsProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <Link href="/admin/dashboard" className="text-xl font-bold text-sky-600 dark:text-sky-400">
            Admin Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <NotificationsBell />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </NotificationsProvider>
  );
}

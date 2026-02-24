"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  LogOut,
  UserPlus,
  Users,
  Tags,
  Package,
  ShoppingCart,
  Warehouse,
  MessageSquare,
  Wallet,
  ImageIcon,
  Palette,
} from "lucide-react";
import { Admin, TabId, TABS_SENIOR, TABS_SUB } from "./types";

interface AdminLayoutProps {
  admin: Admin;
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: React.ReactNode;
}

const TAB_ICONS = {
  LayoutDashboard,
  UserPlus,
  Users,
  Tags,
  Package,
  ShoppingCart,
  Warehouse,
  MessageSquare,
  Wallet,
  ImageIcon,
  Palette,
} as const;

export default function AdminLayout({ admin, currentTab, onTabChange, children }: AdminLayoutProps) {
  const router = useRouter();
  
  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/admin/login");
    router.refresh();
  };

  const tabs = admin.role === "senior" ? TABS_SENIOR : TABS_SUB;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard size={24} className="text-sky-600" />
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white">NuruShop Admin</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {admin.name} · {admin.role === "senior" ? "Senior Admin" : "Sub Admin"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-sky-600"
            >
              View site
            </Link>
     
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => onTabChange(tabItem.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                currentTab === tabItem.id
                  ? "bg-sky-600 text-white"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {(() => {
                const Icon = TAB_ICONS[tabItem.icon as keyof typeof TAB_ICONS] ?? LayoutDashboard;
                return <Icon size={16} />;
              })()}
              {tabItem.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

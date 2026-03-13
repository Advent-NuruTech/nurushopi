"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  CalendarDays,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Palette,
  ShoppingCart,
  Tags,
  Smartphone,
  UserPlus,
  UserCircle2,
  Users,
  Wallet,
  Warehouse,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import NotificationsBell from "./NotificationsBell";
import { Admin, LinkedAccounts, TabId, TABS_SENIOR, TABS_SUB } from "./types";
import { ADMIN_DASHBOARD_PATH, ADMIN_LOGIN_PATH, adminRoute } from "@/lib/adminPaths";

interface AdminLayoutProps {
  admin: Admin;
  linkedAccounts: LinkedAccounts | null;
  currentTab: TabId;
  pageTitle: string;
  onTabChange: (tab: TabId) => void;
  onSwitchToSenior: () => Promise<void>;
  children: React.ReactNode;
}

const TAB_ICONS = {
  LayoutDashboard,
  UserPlus,
  Users,
  Tags,
  Package,
  ShoppingCart,
  ClipboardList,
  Warehouse,
  MessageSquare,
  Wallet,
  ImageIcon,
  Palette,
  CalendarDays,
  Smartphone,
} as const;

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "AD";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function AdminLayout({
  admin,
  linkedAccounts,
  currentTab,
  pageTitle,
  onTabChange,
  onSwitchToSenior,
  children,
}: AdminLayoutProps) {
  const router = useRouter();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const tabs = useMemo(
    () => (admin.role === "senior" ? TABS_SENIOR : TABS_SUB),
    [admin.role]
  );

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST", credentials: "include" });
    router.replace(ADMIN_LOGIN_PATH);
    router.refresh();
  };

  const handleSwitchToSenior = async () => {
    setSwitchingRole(true);
    try {
      await onSwitchToSenior();
      setProfileOpen(false);
    } catch (error) {
      console.error("Role switch error:", error);
    } finally {
      setSwitchingRole(false);
    }
  };

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const close = () => setMobileSidebarOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [mobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-100/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-40 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>

            <button
              type="button"
              onClick={() => setDesktopSidebarCollapsed((prev) => !prev)}
              className="hidden md:inline-flex p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle sidebar"
            >
              {desktopSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            <Link
              href={adminRoute(`${ADMIN_DASHBOARD_PATH}?tab=overview`)}
              className="inline-flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold shrink-0"
            >
              <LayoutDashboard size={20} />
              <span className="hidden sm:inline">NuruShop</span>
            </Link>

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Control Center
              </p>
              <h1 className="text-sm sm:text-base font-semibold truncate">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationsBell />

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="w-9 h-9 rounded-full bg-sky-600 text-white text-xs font-semibold flex items-center justify-center"
                aria-label="Open profile menu"
              >
                {getInitials(admin.name)}
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-sm">{admin.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{admin.email}</p>
                    <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                      {admin.role === "senior" ? "Senior Admin" : "Sub Admin"}
                    </p>
                  </div>

                  <div className="p-2 space-y-1">
                    {admin.role === "sub" && linkedAccounts?.canSwitchToSenior && (
                      <button
                        type="button"
                        onClick={handleSwitchToSenior}
                        disabled={switchingRole}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-60"
                      >
                        {switchingRole ? "Switching..." : "Move to Admin Dashboard"}
                      </button>
                    )}

                    <Link
                      href="/"
                      className="block px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      View site
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <span className="inline-flex items-center gap-2">
                        <LogOut size={14} />
                        Logout
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="absolute inset-0 bg-slate-900/50"
              aria-label="Close menu backdrop"
            />
            <aside className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl">
              <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
                <p className="font-semibold">Navigation</p>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarNav
                tabs={tabs}
                currentTab={currentTab}
                onTabChange={(tab) => {
                  onTabChange(tab);
                  setMobileSidebarOpen(false);
                }}
                collapsed={false}
                showMoveToUserProfile={Boolean(
                  admin.role === "senior" && linkedAccounts?.canMoveToUserProfile
                )}
              />
            </aside>
          </div>
        )}

        <aside
          className={`hidden md:flex md:flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ${
            desktopSidebarCollapsed ? "md:w-20" : "md:w-72"
          }`}
        >
          <SidebarNav
            tabs={tabs}
            currentTab={currentTab}
            onTabChange={onTabChange}
            collapsed={desktopSidebarCollapsed}
            showMoveToUserProfile={Boolean(
              admin.role === "senior" && linkedAccounts?.canMoveToUserProfile
            )}
          />
        </aside>

        <main className="flex-1 min-w-0 px-4 py-5 lg:px-6 lg:py-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarNav({
  tabs,
  currentTab,
  onTabChange,
  collapsed,
  showMoveToUserProfile,
}: {
  tabs: { id: TabId; label: string; icon: string }[];
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
  collapsed: boolean;
  showMoveToUserProfile: boolean;
}) {
  const router = useRouter();

  return (
    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
      {tabs.map((tabItem) => {
        const Icon = TAB_ICONS[tabItem.icon as keyof typeof TAB_ICONS] ?? LayoutDashboard;
        const active = currentTab === tabItem.id;
        return (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => onTabChange(tabItem.id)}
            className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
              active
                ? "bg-sky-600 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title={collapsed ? tabItem.label : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="text-sm font-medium truncate">{tabItem.label}</span>}
          </button>
        );
      })}

      {showMoveToUserProfile && (
        <button
          type="button"
          onClick={() => router.push("/profile")}
          className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          title={collapsed ? "Move to User Profile" : undefined}
        >
          <UserCircle2 size={18} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Move to User Profile</span>}
        </button>
      )}
    </nav>
  );
}

"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { VENDOR_DASHBOARD_PATH, VENDOR_LOGIN_PATH, vendorRoute } from "@/lib/vendorPaths";
import { vendorAuthApi, ApiClientError } from "@/lib/api";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  MessageSquare,
  X,
  ChevronLeft,
  ChevronRight,
  Store,
} from "lucide-react";
import Link from "next/link";

const DashboardOverviewTab = dynamic<{ role: "sub" }>(
  () => import("../../admin/dashboard/components/DashboardOverviewTab"),
  { loading: () => <TabSkeleton /> }
);
const ProductsTab = dynamic<{ adminId: string; role: "sub" }>(
  () => import("../../admin/dashboard/components/ProductsTab"),
  { loading: () => <TabSkeleton /> }
);
const OrdersTab = dynamic<{ adminId: string; role: "sub" }>(
  () => import("../../admin/dashboard/components/OrdersTab"),
  { loading: () => <TabSkeleton /> }
);
const MessagesTab = dynamic<{ adminId: string; role: "sub" }>(
  () => import("../../admin/dashboard/components/MessagesTab"),
  { loading: () => <TabSkeleton /> }
);

type VendorTabId = "overview" | "products" | "orders" | "messages";

const VENDOR_TABS: { id: VendorTabId; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "LayoutDashboard" },
  { id: "products", label: "Products", icon: "Package" },
  { id: "orders", label: "Orders", icon: "ShoppingCart" },
  { id: "messages", label: "Messages", icon: "MessageSquare" },
];

const TAB_LABELS = new Map<VendorTabId, string>(VENDOR_TABS.map((tab) => [tab.id, tab.label]));

const TAB_ICONS = {
  LayoutDashboard,
  Package,
  ShoppingCart,
  MessageSquare,
} as const;

interface Vendor {
  vendorId: string;
  email: string;
  name: string;
  applicationId: string;
}

function isValidTab(value: string | null): value is VendorTabId {
  if (!value) return false;
  return VENDOR_TABS.some((tab) => tab.id === value);
}

function TabSkeleton() {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-3">
      <div className="h-6 rounded bg-slate-200 dark:bg-slate-800 animate-pulse w-52" />
      <div className="h-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse w-full" />
      <div className="h-4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse w-5/6" />
      <div className="h-32 rounded bg-slate-200 dark:bg-slate-800 animate-pulse w-full" />
    </section>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return "VE";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function VendorDashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    vendorAuthApi
      .me()
      .then(({ vendor: dto }) => {
        if (cancelled) return;
        setVendor({
          vendorId: dto.id,
          email: dto.email,
          name: dto.name,
          applicationId: dto.applicationId,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 401) {
          router.replace(VENDOR_LOGIN_PATH);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  const requestedTab = searchParams.get("tab");
  const currentTab = useMemo<VendorTabId>(() => {
    return isValidTab(requestedTab) ? requestedTab : "overview";
  }, [requestedTab]);

  useEffect(() => {
    if (isValidTab(requestedTab)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "overview");
    router.replace(vendorRoute(`${VENDOR_DASHBOARD_PATH}?${params.toString()}`), { scroll: false });
  }, [requestedTab, router, searchParams]);

  const onTabChange = useCallback(
    (tab: VendorTabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.push(vendorRoute(`${VENDOR_DASHBOARD_PATH}?${params.toString()}`), { scroll: false });
    },
    [router, searchParams]
  );

  const handleLogout = async () => {
    await vendorAuthApi.logout().catch(() => {});
    router.replace(VENDOR_LOGIN_PATH);
    router.refresh();
  };

  const pageTitle = TAB_LABELS.get(currentTab) ?? "Dashboard";

  const activeTab = useMemo(() => {
    if (!vendor) return null;
    switch (currentTab) {
      case "overview":
        return <DashboardOverviewTab role="sub" />;
      case "products":
        return <ProductsTab adminId={vendor.vendorId} role="sub" />;
      case "orders":
        return <OrdersTab adminId={vendor.vendorId} role="sub" />;
      case "messages":
        return <MessagesTab adminId={vendor.vendorId} role="sub" />;
      default:
        return <DashboardOverviewTab role="sub" />;
    }
  }, [vendor, currentTab]);

  if (loading || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={48} text="Loading..." />
      </div>
    );
  }

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
              href={vendorRoute(`${VENDOR_DASHBOARD_PATH}?tab=overview`)}
              className="inline-flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold shrink-0"
            >
              <Store size={20} />
              <span className="hidden sm:inline">NuruShop</span>
            </Link>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Vendor Panel
              </p>
              <h1 className="text-sm sm:text-base font-semibold truncate">{pageTitle}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="w-9 h-9 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center"
                aria-label="Open profile menu"
              >
                {getInitials(vendor.name)}
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                    <p className="font-semibold text-sm">{vendor.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{vendor.email}</p>
                    <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">Vendor</p>
                  </div>
                  <div className="p-2 space-y-1">
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
              <VendorSidebarNav
                currentTab={currentTab}
                onTabChange={(tab) => { onTabChange(tab); setMobileSidebarOpen(false); }}
                collapsed={false}
              />
            </aside>
          </div>
        )}

        <aside
          className={`hidden md:flex md:flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 ${
            desktopSidebarCollapsed ? "md:w-20" : "md:w-72"
          }`}
        >
          <VendorSidebarNav
            currentTab={currentTab}
            onTabChange={onTabChange}
            collapsed={desktopSidebarCollapsed}
          />
        </aside>

        <main className="flex-1 min-w-0 px-4 py-5 lg:px-6 lg:py-6">
          <Suspense fallback={<TabSkeleton />}>{activeTab}</Suspense>
        </main>
      </div>
    </div>
  );
}

function VendorSidebarNav({
  currentTab,
  onTabChange,
  collapsed,
}: {
  currentTab: VendorTabId;
  onTabChange: (tab: VendorTabId) => void;
  collapsed: boolean;
}) {
  return (
    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
      {VENDOR_TABS.map((tabItem) => {
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
    </nav>
  );
}

export default function VendorDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size={48} text="Loading..." /></div>}>
      <VendorDashboardPageContent />
    </Suspense>
  );
}

"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AdminLayout from "./components/AdminLayout";
import TabErrorBoundary from "./components/TabErrorBoundary";
import { Admin, AdminRole, LinkedAccounts, TabId, TABS_SENIOR, TABS_SUB } from "./components/types";
import { ADMIN_DASHBOARD_PATH, ADMIN_LOGIN_PATH, adminRoute } from "@/lib/adminPaths";

const DashboardOverviewTab = dynamic<{ role: AdminRole }>(
  () => import("./components/DashboardOverviewTab"),
  { loading: () => <TabSkeleton /> }
);
const InviteTab = dynamic(() => import("./components/InviteTab"), {
  loading: () => <TabSkeleton />,
});
const AdminsTab = dynamic(() => import("./components/AdminsTab"), {
  loading: () => <TabSkeleton />,
});
const CategoriesTab = dynamic(() => import("./components/CategoriesTab"), {
  loading: () => <TabSkeleton />,
});
const HeroTab = dynamic(() => import("./components/HeroTab"), {
  loading: () => <TabSkeleton />,
});
const ProductsTab = dynamic<{ adminId: string; role: AdminRole }>(
  () => import("./components/ProductsTab"),
  { loading: () => <TabSkeleton /> }
);
const OrdersTab = dynamic<{ adminId: string; role: AdminRole }>(
  () => import("./components/OrdersTab"),
  { loading: () => <TabSkeleton /> }
);
const VendorApplicationsTab = dynamic(() => import("./components/VendorApplicationsTab"), {
  loading: () => <TabSkeleton />,
});
const WholesaleTab = dynamic(() => import("./components/WholesaleTab"), {
  loading: () => <TabSkeleton />,
});
const ReviewsTab = dynamic(() => import("./components/ReviewsTab"), {
  loading: () => <TabSkeleton />,
});
const RedemptionsTab = dynamic(() => import("./components/RedemptionsTab"), {
  loading: () => <TabSkeleton />,
});
const UsersTab = dynamic<{ role: AdminRole }>(() => import("./components/UsersTab"), {
  loading: () => <TabSkeleton />,
});
const BannersTab = dynamic(() => import("./components/BannersTab"), {
  loading: () => <TabSkeleton />,
});
const ContactsTab = dynamic(() => import("./components/ContactsTab"), {
  loading: () => <TabSkeleton />,
});
const MessagesTab = dynamic<{ adminId: string; role: AdminRole }>(
  () => import("./components/MessagesTab"),
  { loading: () => <TabSkeleton /> }
);
const SabbathMessagesTab = dynamic(() => import("./components/SabbathMessagesTab"), {
  loading: () => <TabSkeleton />,
});

const TAB_LABELS = new Map<TabId, string>([...TABS_SENIOR, ...TABS_SUB].map((tab) => [tab.id, tab.label]));

function isValidTab(value: string | null, role: AdminRole): value is TabId {
  if (!value) return false;
  const allowed = role === "senior" ? TABS_SENIOR : TABS_SUB;
  return allowed.some((tab) => tab.id === value);
}

function getDefaultTab(): TabId {
  return "overview";
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

function AdminDashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [admin, setAdmin] = useState<Admin | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me", { credentials: "include" })
      .then((r) => {
        if (cancelled) return null;
        if (r.status === 401) {
          router.replace(ADMIN_LOGIN_PATH);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data?.admin) return;
        setAdmin(data.admin);
        setLinkedAccounts(data.linkedAccounts ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const requestedTab = searchParams.get("tab");
  const currentTab = useMemo<TabId>(() => {
    if (!admin) return getDefaultTab();
    return isValidTab(requestedTab, admin.role) ? requestedTab : getDefaultTab();
  }, [admin, requestedTab]);

  useEffect(() => {
    if (!admin) return;
    if (requestedTab && isValidTab(requestedTab, admin.role)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", getDefaultTab());
    router.replace(adminRoute(`${ADMIN_DASHBOARD_PATH}?${params.toString()}`), { scroll: false });
  }, [admin, requestedTab, router, searchParams]);

  useEffect(() => {
    if (!admin) return;
    const scrollKey = `nurushop-admin-scroll:${admin.adminId}:${currentTab}`;
    const savedScroll = sessionStorage.getItem(scrollKey);
    if (savedScroll) {
      window.scrollTo({ top: Number(savedScroll), behavior: "auto" });
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    const saveScroll = () => {
      sessionStorage.setItem(scrollKey, String(window.scrollY));
    };
    window.addEventListener("scroll", saveScroll, { passive: true });
    return () => {
      saveScroll();
      window.removeEventListener("scroll", saveScroll);
    };
  }, [admin, currentTab]);

  const onTabChange = useCallback(
    (tab: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.push(adminRoute(`${ADMIN_DASHBOARD_PATH}?${params.toString()}`), { scroll: false });
    },
    [router, searchParams]
  );

  const onSwitchToSenior = useCallback(async () => {
    const response = await fetch("/api/admin/auth/switch-role", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetRole: "senior" }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error ?? "Unable to switch account role.");
    }

    window.location.assign(`${ADMIN_DASHBOARD_PATH}?tab=overview`);
  }, []);

  const pageTitle = TAB_LABELS.get(currentTab) ?? "Dashboard";

  const activeTab = useMemo(() => {
    if (!admin) return null;

    switch (currentTab) {
      case "overview":
        return <DashboardOverviewTab role={admin.role} />;
      case "invite":
        return admin.role === "senior" ? <InviteTab /> : null;
      case "admins":
        return admin.role === "senior" ? <AdminsTab /> : null;
      case "categories":
        return admin.role === "senior" ? <CategoriesTab /> : null;
      case "hero":
        return admin.role === "senior" ? <HeroTab /> : null;
      case "products":
        return <ProductsTab adminId={admin.adminId} role={admin.role} />;
      case "orders":
        return <OrdersTab adminId={admin.adminId} role={admin.role} />;
      case "vendorApplications":
        return admin.role === "senior" ? <VendorApplicationsTab /> : null;
      case "wholesale":
        return admin.role === "senior" ? <WholesaleTab /> : null;
      case "reviews":
        return admin.role === "senior" ? <ReviewsTab /> : null;
      case "redemptions":
        return admin.role === "senior" ? <RedemptionsTab /> : null;
      case "users":
        return admin.role === "senior" ? <UsersTab role={admin.role} /> : null;
      case "banners":
        return admin.role === "senior" ? <BannersTab /> : null;
      case "contacts":
        return admin.role === "senior" ? <ContactsTab /> : null;
      case "messages":
        return <MessagesTab adminId={admin.adminId} role={admin.role} />;
      case "sabbathMessages":
        return admin.role === "senior" ? <SabbathMessagesTab /> : null;
      default:
        return <DashboardOverviewTab role={admin.role} />;
    }
  }, [admin, currentTab]);

  if (loading || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={48} text="Loading..." />
      </div>
    );
  }

  return (
    <AdminLayout
      admin={admin}
      linkedAccounts={linkedAccounts}
      currentTab={currentTab}
      pageTitle={pageTitle}
      onTabChange={onTabChange}
      onSwitchToSenior={onSwitchToSenior}
    >
      <TabErrorBoundary tabLabel={currentTab}>
        <Suspense fallback={<TabSkeleton />}>{activeTab}</Suspense>
      </TabErrorBoundary>
    </AdminLayout>
  );
}

function DashboardPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size={48} text="Loading..." />
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardPageFallback />}>
      <AdminDashboardPageContent />
    </Suspense>
  );
}

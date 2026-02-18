"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AdminLayout from "./components/AdminLayout";
import InviteTab from "./components/InviteTab";
import AdminsTab from "./components/AdminsTab";
import ProductsTab from "./components/ProductsTab";
import OrdersTab from "./components/OrdersTab";
import BannersTab from "./components/BannersTab";
import ContactsTab from "./components/ContactsTab";
import CategoriesTab from "./components/CategoriesTab";
import MessagesTab from "./components/MessagesTab";
import UsersTab from "./components/UsersTab";
import ReviewsTab from "./components/ReviewsTab";
import RedemptionsTab from "./components/RedemptionsTab";
import WholesaleTab from "./components/WholesaleTab";
import DashboardOverviewTab from "./components/DashboardOverviewTab";
import { Admin, TabId, TABS_SENIOR, TABS_SUB } from "./components/types";

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me", { credentials: "include" })
      .then((r) => {
        if (cancelled) return null;
        if (r.status === 401) {
          router.replace("/admin/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled || !data?.admin) return;
        setAdmin(data.admin);
        setTab("overview");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    if (!admin || !tabParam) return;
    const allowedTabs = admin.role === "senior" ? TABS_SENIOR : TABS_SUB;
    if (allowedTabs.some((t) => t.id === tabParam)) {
      setTab(tabParam);
    }
  }, [admin, tabParam]);

  if (loading || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={48} text="Loading…" />
      </div>
    );
  }

  return (
    <AdminLayout admin={admin} currentTab={tab} onTabChange={setTab}>
      {tab === "overview" && <DashboardOverviewTab role={admin.role} />}
      {tab === "invite" && admin.role === "senior" && <InviteTab />}
      {tab === "admins" && admin.role === "senior" && <AdminsTab />}
      {tab === "categories" && admin.role === "senior" && <CategoriesTab />}
      {tab === "products" && <ProductsTab adminId={admin.adminId} role={admin.role} />}
      {tab === "orders" && <OrdersTab adminId={admin.adminId} role={admin.role} />}
      {tab === "wholesale" && admin.role === "senior" && <WholesaleTab />}
      {tab === "reviews" && admin.role === "senior" && <ReviewsTab />}
      {tab === "redemptions" && admin.role === "senior" && <RedemptionsTab />}
      {tab === "users" && admin.role === "senior" && <UsersTab role={admin.role} />}
      {tab === "banners" && admin.role === "senior" && <BannersTab />}
      {tab === "contacts" && admin.role === "senior" && <ContactsTab />}
      {tab === "messages" && <MessagesTab adminId={admin.adminId} role={admin.role} />}
    </AdminLayout>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size={48} text="Loading…" />
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}

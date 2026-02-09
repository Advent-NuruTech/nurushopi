"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Admin, TabId } from "./components/types";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("products");

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
        setTab(data.admin.role === "sub" ? "products" : "products");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  if (loading || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={48} text="Loading…" />
      </div>
    );
  }

  return (
    <AdminLayout admin={admin} currentTab={tab} onTabChange={setTab}>
      {tab === "invite" && admin.role === "senior" && <InviteTab />}
      {tab === "admins" && admin.role === "senior" && <AdminsTab />}
      {tab === "categories" && admin.role === "senior" && <CategoriesTab />}
      {tab === "products" && <ProductsTab adminId={admin.adminId} role={admin.role} />}
      {tab === "orders" && <OrdersTab adminId={admin.adminId} role={admin.role} />}
      {tab === "banners" && admin.role === "senior" && <BannersTab />}
      {tab === "contacts" && admin.role === "senior" && <ContactsTab />}
      {tab === "messages" && <MessagesTab adminId={admin.adminId} role={admin.role} />}
    </AdminLayout>
  );
}

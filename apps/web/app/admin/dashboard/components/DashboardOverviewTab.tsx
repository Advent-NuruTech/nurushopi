"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  ShieldCheck,
  UserCog,
  Package,
  Warehouse,
  Store,
  TrendingUp,
  XCircle,
  MessageSquare,
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatPrice } from "@/lib/formatPrice";
import { dashboardApi } from "@/lib/api";
import type { AdminRole } from "./types";
import type { DashboardStatsDTO } from "@nuru/types";

export default function DashboardOverviewTab({ role }: { role: AdminRole }) {
  const [stats, setStats] = useState<DashboardStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    dashboardApi
      .stats()
      .then((d) => {
        if (!cancelled) setStats(d.stats);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    if (!stats) return [];
    const base = [
      { label: "Products", value: stats.catalog.products, icon: Package },
      { label: "Active Products", value: stats.catalog.activeProducts, icon: Store },
      { label: "Low Stock", value: stats.catalog.lowStock, icon: Warehouse },
      { label: "Out of Stock", value: stats.catalog.outOfStock, icon: XCircle },
      { label: "Total Orders", value: stats.orders.total, icon: MessageSquare },
      { label: "Pending Fulfilment", value: stats.orders.pendingFulfilment, icon: UserCog },
    ];

    if (role === "senior") {
      return [
        { label: "Customers", value: stats.customers.total, icon: Users },
        { label: "Paid Revenue", value: formatPrice(Number(stats.revenue.paidTotal)), icon: TrendingUp },
        { label: "Paid Orders", value: stats.revenue.paidOrders, icon: ShieldCheck },
        ...base,
        { label: "Pending Redemptions", value: stats.wallet.pendingRedemptions, icon: MessageSquare },
        { label: "Wallet Liability", value: formatPrice(Number(stats.wallet.outstandingBalance)), icon: TrendingUp },
      ];
    }

    return base;
  }, [role, stats]);

  if (loading) return <LoadingSpinner text="Loading dashboard stats..." />;

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Dashboard Overview</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {role === "senior"
            ? "Live totals across users, products, orders, and moderation."
            : "Live totals for products and orders you manage."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{card.label}</p>
                <Icon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}


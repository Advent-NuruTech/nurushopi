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
import type { AdminRole } from "./types";

type Stats = {
  users: number;
  admins: number;
  subAdmins: number;
  products: number;
  wholesaleProducts: number;
  retailProducts: number;
  totalSales: number;
  totalCancellations: number;
  totalReviews: number;
  orders?: number;
};

const defaultStats: Stats = {
  users: 0,
  admins: 0,
  subAdmins: 0,
  products: 0,
  wholesaleProducts: 0,
  retailProducts: 0,
  totalSales: 0,
  totalCancellations: 0,
  totalReviews: 0,
};

export default function DashboardOverviewTab({ role }: { role: AdminRole }) {
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/dashboard/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load stats"))))
      .then((d: { stats?: Partial<Stats> }) => {
        if (cancelled) return;
        setStats({ ...defaultStats, ...(d.stats ?? {}) });
      })
      .catch(() => {
        if (!cancelled) setStats(defaultStats);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => {
    const base = [
      { label: "Products", value: stats.products, icon: Package },
      { label: "Wholesale", value: stats.wholesaleProducts, icon: Warehouse },
      { label: "Retail", value: stats.retailProducts, icon: Store },
      { label: "Total Sales", value: formatPrice(stats.totalSales), icon: TrendingUp },
      { label: "Cancellations", value: stats.totalCancellations, icon: XCircle },
    ];

    if (role === "senior") {
      return [
        { label: "Users", value: stats.users, icon: Users },
        { label: "Admins", value: stats.admins, icon: ShieldCheck },
        { label: "Sub Admins", value: stats.subAdmins, icon: UserCog },
        ...base,
        { label: "Reviews", value: stats.totalReviews, icon: MessageSquare },
      ];
    }

    return [
      ...base,
      { label: "Managed Orders", value: stats.orders ?? 0, icon: MessageSquare },
    ];
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


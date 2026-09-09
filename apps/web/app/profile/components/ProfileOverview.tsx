"use client";

import React from "react";
import Image from "next/image";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Gift,
  Package,
  User as UserIcon,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { UserProfile } from "../types";

interface ProfileOverviewProps {
  profile: UserProfile | null;
  profileLoading: boolean;
  displayName: string;
  email: string;
  avatarUrl: string;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  inviteCount: number;
  onNavigate: (tab: string) => void;
}

export default function ProfileOverview({
  profile,
  profileLoading,
  displayName,
  email,
  avatarUrl,
  totalOrders,
  pendingOrders,
  deliveredOrders,
  inviteCount,
  onNavigate,
}: ProfileOverviewProps) {
  if (profileLoading) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="p-6 sm:p-8">
          <div className="flex justify-center py-8">
            <LoadingSpinner size={36} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
      <div className="p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <UserIcon size={20} className="text-brand" />
            Profile overview
          </h2>
          <button
            type="button"
            onClick={() => onNavigate("profile")}
            className="text-sm font-semibold text-brand transition-colors hover:text-brand-strong"
          >
            Edit profile
          </button>
        </div>
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="relative shrink-0">
            <Image
              src={avatarUrl}
              alt="Avatar"
              width={96}
              height={96}
              className="rounded-2xl object-cover ring-2 ring-brand/30"
              priority
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-semibold text-slate-900 dark:text-white">{displayName}</p>
            <p className="mt-1 break-all text-slate-600 dark:text-slate-400">{email}</p>
          </div>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={Package}
            label="All orders"
            value={totalOrders}
            detail="Your order history"
            onClick={() => onNavigate("orders")}
          />
          <SummaryCard
            icon={Clock}
            label="Needs attention"
            value={pendingOrders}
            detail={pendingOrders === 1 ? "Order in progress" : "Orders in progress"}
            tone="amber"
            onClick={() => onNavigate("orders")}
          />
          <SummaryCard
            icon={Wallet}
            label="Wallet balance"
            value={formatPrice(
              typeof profile?.walletBalance === "number" ? profile.walletBalance : 0,
            )}
            detail="Available NuruShop credit"
            tone="brand"
            onClick={() => onNavigate("wallet")}
          />
          <SummaryCard
            icon={Gift}
            label="Friends invited"
            value={inviteCount}
            detail="Share and earn together"
            tone="brand"
            onClick={() => onNavigate("invite")}
          />
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-brand-surface px-4 py-3 text-sm text-brand-ink dark:bg-brand-strong/20 dark:text-brand-surface">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-brand" />
          <span>
            {deliveredOrders} {deliveredOrders === 1 ? "order has" : "orders have"} been delivered
            successfully.
          </span>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "slate",
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  tone?: "slate" | "amber" | "brand";
  onClick: () => void;
}) {
  const tones = {
    slate:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
    amber:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100",
    brand:
      "border-brand-border bg-brand-surface text-brand-ink dark:border-brand-strong dark:bg-brand-strong/20 dark:text-brand-surface",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <Icon className="h-5 w-5" />
        <ChevronRight className="h-4 w-4 opacity-50 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs opacity-75">{detail}</p>
    </button>
  );
}

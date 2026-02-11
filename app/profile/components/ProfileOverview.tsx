"use client";

import React from "react";
import Image from "next/image";
import { Package, Clock, CheckCircle2, User as UserIcon, Wallet } from "lucide-react";
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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <UserIcon size={20} />
          Profile Overview
        </h2>
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="relative shrink-0">
            <Image
              src={avatarUrl}
              alt="Avatar"
              width={96}
              height={96}
              className="rounded-2xl object-cover ring-2 ring-sky-500/30 dark:ring-sky-400/30"
              priority
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {displayName}
            </p>
            <p className="text-slate-600 dark:text-slate-400 mt-1 break-all">{email}</p>
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Package size={18} />
                <span className="font-medium">{totalOrders}</span>
                <span className="text-sm">Total orders</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                <Clock size={18} />
                <span className="font-medium">{pendingOrders}</span>
                <span className="text-sm">Pending</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 size={18} />
                <span className="font-medium">{deliveredOrders}</span>
                <span className="text-sm">Delivered</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200">
                <Wallet size={18} />
                <span className="font-medium">
                  {typeof profile?.walletBalance === "number"
                    ? profile.walletBalance.toLocaleString()
                    : "0"}
                </span>
                <span className="text-sm">Wallet (KSh)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

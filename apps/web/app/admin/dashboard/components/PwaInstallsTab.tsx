"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { pwaApi, ApiClientError } from "@/lib/api";
import type { PwaInstallStatsDTO } from "@nuru/types";

export default function PwaInstallsTab() {
  const [stats, setStats] = useState<PwaInstallStatsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    pwaApi.admin
      .stats()
      .then((payload) => {
        if (!cancelled) setStats(payload);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Unable to load install stats.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingSpinner text="Loading install stats..." />;

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">PWA Installs</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track how many users have installed the NuruShop app.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Total installs
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {stats?.totalInstalled ?? 0}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Unique users that have installed the PWA.
          </p>
        </div>
      </div>
    </section>
  );
}

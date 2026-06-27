"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_DASHBOARD_PATH, adminRoute } from "@/lib/adminPaths";

export default function AdminRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(adminRoute(ADMIN_DASHBOARD_PATH));
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500 dark:text-slate-400">Redirecting…</p>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRootPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500 dark:text-slate-400">Redirecting…</p>
    </div>
  );
}

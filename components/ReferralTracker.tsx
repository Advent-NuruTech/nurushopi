"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const STORAGE_KEY = "nurushop_referrer";

export default function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;
    try {
      localStorage.setItem(STORAGE_KEY, ref);
    } catch {
      // ignore storage errors
    }
  }, [searchParams]);

  return null;
}

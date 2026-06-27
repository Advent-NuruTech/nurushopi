"use client";

import { useEffect, useState } from "react";
import { getSabbathTiming, type SabbathTiming } from "@/lib/isSabbathClosed";

type SabbathStatusOptions = {
  intervalMs?: number;
};

export function useSabbathStatus(options: SabbathStatusOptions = {}): SabbathTiming {
  const intervalMs = options.intervalMs ?? 60_000;
  const [windowState, setWindowState] = useState(() => getSabbathTiming());

  useEffect(() => {
    const update = () => setWindowState(getSabbathTiming());
    update();
    const interval = setInterval(update, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return windowState;
}

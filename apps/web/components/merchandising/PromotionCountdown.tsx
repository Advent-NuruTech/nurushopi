"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";

function remainingLabel(milliseconds: number) {
  if (milliseconds <= 0) return "Offer ended";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  return days > 0 ? `${days}d ${clock}` : clock;
}

export default function PromotionCountdown({
  endsAt,
  initialNow,
  compact = false,
}: {
  endsAt: string;
  initialNow?: string;
  compact?: boolean;
}) {
  const initialRemaining = useMemo(() => {
    if (!initialNow) return null;
    const end = Date.parse(endsAt);
    const now = Date.parse(initialNow);
    return Number.isFinite(end) && Number.isFinite(now) ? Math.max(0, end - now) : null;
  }, [endsAt, initialNow]);
  const [remaining, setRemaining] = useState<number | null>(initialRemaining);

  useEffect(() => {
    const end = Date.parse(endsAt);
    if (!Number.isFinite(end)) return;
    const update = () => setRemaining(Math.max(0, end - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold tabular-nums ${compact ? "text-[10px]" : "text-xs"}`}
      aria-label={
        remaining == null ? "Limited-time offer" : `Offer ends in ${remainingLabel(remaining)}`
      }
    >
      <Clock3 size={compact ? 12 : 14} aria-hidden="true" />
      {remaining == null ? "Ends soon" : remainingLabel(remaining)}
    </span>
  );
}

import { Star } from "lucide-react";
import type { ReviewSummaryDTO } from "@nuru/types";

interface RatingStarsProps {
  summary?: Pick<ReviewSummaryDTO, "average" | "count"> | null;
  size?: number;
  showValue?: boolean;
  showCount?: boolean;
  className?: string;
}

export default function RatingStars({
  summary,
  size = 17,
  showValue = true,
  showCount = true,
  className = "",
}: RatingStarsProps) {
  // Older cached product responses may not have the projected rating yet.
  // Treat that state as unrated so every product surface remains render-safe.
  const count = Number.isFinite(summary?.count) ? Math.max(0, summary?.count ?? 0) : 0;
  const rawAverage = Number.isFinite(summary?.average) ? (summary?.average ?? 0) : 0;
  const average = count > 0 ? Math.min(5, Math.max(0, rawAverage)) : 0;
  const label =
    count > 0
      ? `${average.toFixed(1)} out of 5 from ${count} verified ${count === 1 ? "review" : "reviews"}`
      : "No reviews yet";

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 ${className}`} aria-label={label}>
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => {
          const fill = Math.min(100, Math.max(0, (average - index) * 100));
          return (
            <span key={index} className="relative inline-flex text-slate-300 dark:text-slate-600">
              <Star size={size} strokeWidth={1.8} />
              <span
                className="absolute inset-0 overflow-hidden text-amber-400"
                style={{ width: `${fill}%` }}
              >
                <Star size={size} fill="currentColor" strokeWidth={1.8} />
              </span>
            </span>
          );
        })}
      </span>
      {count > 0 ? (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {showValue && (
            <strong className="font-semibold text-slate-800 dark:text-slate-100">
              {average.toFixed(1)}
            </strong>
          )}
          {showValue && showCount && <span aria-hidden="true"> · </span>}
          {showCount && (
            <span>
              {count} verified {count === 1 ? "review" : "reviews"}
            </span>
          )}
        </span>
      ) : showCount ? (
        <span className="text-sm text-slate-500 dark:text-slate-400">No reviews yet</span>
      ) : null}
    </div>
  );
}

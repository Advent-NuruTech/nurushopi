import type { ReviewSummaryDTO } from "@nuru/types";
import RatingStars from "./RatingStars";

export default function RatingBreakdown({ summary }: { summary: ReviewSummaryDTO }) {
  return (
    <div className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[180px_1fr]">
      <div className="flex flex-col justify-center text-center sm:text-left">
        <p className="text-4xl font-black text-slate-950 dark:text-white">
          {summary.count ? summary.average.toFixed(1) : "—"}
        </p>
        <RatingStars
          summary={summary}
          showValue={false}
          showCount={false}
          className="mt-2 justify-center sm:justify-start"
        />
        <p className="mt-2 text-sm text-slate-500">
          {summary.count} verified {summary.count === 1 ? "review" : "reviews"}
        </p>
      </div>
      <div className="space-y-2" aria-label="Rating distribution">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count =
            summary.distribution[String(rating) as keyof typeof summary.distribution] ?? 0;
          const width = summary.count ? (count / summary.count) * 100 : 0;
          return (
            <div
              key={rating}
              className="grid grid-cols-[28px_1fr_30px] items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
            >
              <span>{rating}★</span>
              <span className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <span
                  className="block h-full rounded-full bg-amber-400"
                  style={{ width: `${width}%` }}
                />
              </span>
              <span className="text-right">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

interface ProductCardSkeletonProps {
  className?: string;
}

export default function ProductCardSkeleton({ className = "" }: ProductCardSkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div className="h-40 sm:h-52 bg-slate-200 dark:bg-slate-800" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="pt-2 h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

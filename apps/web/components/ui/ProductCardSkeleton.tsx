interface ProductCardSkeletonProps {
  className?: string;
}

export default function ProductCardSkeleton({ className = "" }: ProductCardSkeletonProps) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
      aria-hidden="true"
    >
      <div className="nurushop-skeleton relative flex h-40 items-center justify-center overflow-hidden sm:h-52">
        <span className="select-none text-lg font-extrabold tracking-[0.16em] text-slate-300/70 dark:text-slate-700/70 sm:text-xl">
          NURUSHOP
        </span>
      </div>
      <div className="space-y-3 p-3.5">
        <div className="nurushop-skeleton h-4 w-3/4 rounded-full" />
        <div className="nurushop-skeleton h-3 w-full rounded-full" />
        <div className="nurushop-skeleton h-3 w-2/3 rounded-full" />
        <div className="flex items-center justify-between pt-1">
          <div className="nurushop-skeleton h-5 w-20 rounded-full" />
          <div className="nurushop-skeleton h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

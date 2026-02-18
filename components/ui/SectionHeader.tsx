"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";

interface SectionHeaderProps {
  title: string;
  href?: string;
  viewText?: string;
  className?: string;
  showViewAll?: boolean;
}

function HeaderBar({
  title,
  href,
  viewText,
  className,
  shouldShowViewAll,
}: {
  title: string;
  href?: string;
  viewText: string;
  className: string;
  shouldShowViewAll: boolean;
}) {
  return (
    <div className={`w-full ${className}`}>
      <div className="w-full flex items-center text-white px-2 sm:px-6 py-3 rounded-xl shadow-sm text-sm sm:text-base font-bold tracking-wide bg-blue-600">
        <div className="flex-1 text-left truncate">{title}</div>

        {shouldShowViewAll && <div className="px-3 opacity-80 select-none">||</div>}

        {shouldShowViewAll && (
          <div className="flex-1 text-right">
            <Link
              href={href as Route}
              className="underline-offset-4 hover:underline font-semibold whitespace-nowrap"
            >
              {viewText}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeaderInner({
  title,
  href,
  viewText = "View All",
  className = "",
  showViewAll = true,
}: SectionHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category")?.toLowerCase().trim() ?? "";
  const targetCategory = useMemo(() => {
    if (!href) return "";
    try {
      const url = new URL(href, "http://localhost");
      return url.searchParams.get("category")?.toLowerCase().trim() ?? "";
    } catch {
      return "";
    }
  }, [href]);

  const isShopPage = pathname === "/shop";
  const isCurrentCategoryLink =
    isShopPage && Boolean(currentCategory) && Boolean(targetCategory) && currentCategory === targetCategory;
  const shouldShowViewAll = Boolean(href) && showViewAll && !isShopPage && !isCurrentCategoryLink;

  return (
    <HeaderBar
      title={title}
      href={href}
      viewText={viewText}
      className={className}
      shouldShowViewAll={shouldShowViewAll}
    />
  );
}

function SectionHeaderFallback({
  title,
  href,
  viewText = "View All",
  className = "",
  showViewAll = true,
}: SectionHeaderProps) {
  const shouldShowViewAll = Boolean(href) && showViewAll;
  return (
    <HeaderBar
      title={title}
      href={href}
      viewText={viewText}
      className={className}
      shouldShowViewAll={shouldShowViewAll}
    />
  );
}

export default function SectionHeader(props: SectionHeaderProps) {
  return (
    <Suspense fallback={<SectionHeaderFallback {...props} />}>
      <SectionHeaderInner {...props} />
    </Suspense>
  );
}

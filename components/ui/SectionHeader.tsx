"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";

interface SectionHeaderProps {
  title: string;
  href?: string;
  viewText?: string;
  className?: string;
}

export default function SectionHeader({
  title,
  href,
  viewText = "View All",
  className = "",
}: SectionHeaderProps) {
  const [isBlue, setIsBlue] = useState(true);

  useEffect(() => {
    // Change color every 10 seconds
    const interval = setInterval(() => {
      setIsBlue((prev) => !prev);
    }, 10000); // 10,000 ms = 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`w-full flex items-center text-white px-2 sm:px-6 py-3 rounded-x3 shadow-sm text-sm sm:text-base font-bold tracking-wide transition-colors duration-1000 ${
          isBlue ? "bg-blue-600" : "bg-red-600"
        }`}
      >
        {/* Left — Title */}
        <div className="flex-1 text-left truncate">{title}</div>

        {/* Center Divider */}
        {href && (
          <div className="px-3 opacity-80 select-none">||</div>
        )}

        {/* Right — Navigation */}
        {href && (
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

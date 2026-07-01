"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Truck } from "lucide-react";
import { HERO_DEFAULT_GRADIENT, resolveHeroGradient } from "@/lib/heroGradients";
import { catalogApi } from "@/lib/api";

type HeroAnnouncement = {
  id: string;
  text: string;
  gradient: string;
  order: number;
};

export default function HeroSection() {
  const [announcements, setAnnouncements] = useState<HeroAnnouncement[]>([]);

  useEffect(() => {
    let cancelled = false;
    // Active announcements come from the Express API (public catalog endpoint).
    // The DTO carries the copy in `message`; this marquee renders it as `text`.
    catalogApi
      .listHero()
      .then((d) => {
        if (cancelled) return;
        const cleaned = d.announcements
          .map((item, index) => ({
            id: item.id,
            text: (item.message ?? "").trim(),
            gradient: resolveHeroGradient(
              (item.gradient ?? "").trim() || HERO_DEFAULT_GRADIENT
            ),
            order: Number.isFinite(item.order) ? item.order : index,
          }))
          .filter((item) => item.text.length > 0)
          .sort((a, b) => a.order - b.order);
        setAnnouncements(cleaned);
      })
      .catch(() => {
        if (!cancelled) setAnnouncements([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const marqueeItems = useMemo(() => {
    if (announcements.length === 0) return [];
    return [...announcements, ...announcements];
  }, [announcements]);

  const items =
    marqueeItems.length > 0
      ? marqueeItems
      : [
          {
            id: "fallback-1",
            text: "Fast delivery across Kenya",
            gradient: "from-emerald-600 via-sky-600 to-blue-700",
            order: 1,
          },
          {
            id: "fallback-2",
            text: "Secure checkout and verified products",
            gradient: "from-blue-700 via-indigo-600 to-emerald-600",
            order: 2,
          },
        ];

  return (
    <section
      className="
        relative
        w-full
        py-2
        px-4
        mt-0
        mb-0
        overflow-hidden
        border-b
        border-slate-200
        bg-slate-950
        text-white
      "
    >
      <div className="relative mx-auto flex max-w-7xl items-center gap-4 overflow-hidden text-xs sm:text-sm">
        <div className="hidden shrink-0 items-center gap-3 font-semibold text-emerald-200 md:flex">
          <span className="inline-flex items-center gap-1.5">
            <Truck size={15} /> Nationwide delivery
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={15} /> Buyer protection
          </span>
        </div>

        <div className="flex min-w-0 flex-1 overflow-hidden">
          <div className="flex whitespace-nowrap animate-scroll">
          {items.map((item, i) => {
            const offsetY = Number((Math.sin(i * 2) * 3).toFixed(5));
            return (
              <span
                key={`${item.id}-${i}`}
                className={`
                  mx-10
                  font-semibold
                  transition-transform
                  duration-300
                  hover:scale-110
                  bg-gradient-to-r ${item.gradient}
                  bg-clip-text
                  text-transparent
                `}
                style={{
                  transform: `translateY(${offsetY}px)`,
                }}
              >
                {item.text}
              </span>
            );
          })}
          </div>
        </div>
      </div>
    </section>
  );
}

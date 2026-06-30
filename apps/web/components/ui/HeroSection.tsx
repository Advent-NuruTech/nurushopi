"use client";

import React, { useEffect, useMemo, useState } from "react";
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

  if (marqueeItems.length === 0) return null;

  return (
    <section
      className="
        relative
        w-full
        rounded-lg
        py-3
        px-4
        mt-0
        mb-4
        overflow-hidden
        bg-gradient-to-r
        from-emerald-50
        via-white
        to-sky-50
        dark:from-gray-900
        dark:via-gray-950
        dark:to-gray-900
      "
    >
      <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-400/20 dark:bg-emerald-600/10 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-sky-400/20 dark:bg-sky-600/10 blur-3xl rounded-full" />

      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-black/10 dark:bg-white/10 animate-float"
          style={{
            top: `${20 + i * 10}%`,
            left: `${10 + i * 15}%`,
            animationDuration: `${(14 + i * 3) * 2}s`,
          }}
        />
      ))}

      <div className="relative max-w-5xl mx-auto flex items-center overflow-hidden py-1">
        <div className="flex whitespace-nowrap animate-scroll">
          {marqueeItems.map((item, i) => {
            const offsetY = Number((Math.sin(i * 2) * 3).toFixed(5));
            return (
              <span
                key={`${item.id}-${i}`}
                className={`
                  mx-24
                  text-2xl
                  sm:text-3xl
                  font-extrabold
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
    </section>
  );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Truck, Sparkles, Zap, Star } from "lucide-react";
import { HERO_DEFAULT_GRADIENT, resolveHeroGradient } from "@/lib/heroGradients";
import { catalogApi } from "@/lib/api";
import Link from "next/link";

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
            text: "✨ Fast delivery across Kenya",
            gradient: "from-violet-400 via-purple-400 to-pink-400",
            order: 1,
          },
          {
            id: "fallback-2",
            text: "🚀 Secure checkout & verified products",
            gradient: "from-cyan-400 via-blue-400 to-indigo-400",
            order: 2,
          },
        ];

  return (
    <section
      className="
        relative
        w-full
        py-3
        px-3
        overflow-hidden
        border-b
        border-white/10
        bg-gradient-to-r
        from-slate-900/95
        via-indigo-950/90
        to-slate-900/95
        backdrop-blur-xl
        text-white
        shadow-2xl
        shadow-black/30
      "
    >
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-l from-blue-500/10 via-cyan-500/5 to-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-6 overflow-hidden text-sm sm:text-base md:text-lg">
        {/* Left side - Static info with modern design */}
        <div className="hidden shrink-0 items-center gap-4 font-semibold md:flex">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 backdrop-blur-sm border border-white/10 shadow-lg">
            <Truck size={18} className="text-emerald-400 animate-pulse" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">
              Nationwide delivery
            </span>
          </div>
          
          <span className="h-8 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          
          <Link 
            href="/vendors"
            className="group inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-bold transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 border border-white/20 hover:border-white/30"
          >
            <Sparkles size={16} className="text-yellow-300" />
            Sell here
            <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
          </Link>
        </div>

        {/* Right side - Marquee with modern animations */}
        <div className="flex min-w-0 flex-1 overflow-hidden">
          <div className="flex whitespace-nowrap animate-scroll gap-12">
            {items.map((item, i) => {
              const offsetY = Number((Math.sin(i * 1.5) * 3).toFixed(5));
              return (
                <span
                  key={`${item.id}-${i}`}
                  className={`
                    inline-block
                    text-base
                    sm:text-lg
                    md:text-xl
                    font-extrabold
                    tracking-wide
                    transition-all
                    duration-500
                    hover:scale-110
                    hover:brightness-150
                    bg-gradient-to-r 
                    ${item.gradient}
                    bg-clip-text
                    text-transparent
                    drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]
                    hover:drop-shadow-[0_4px_12px_rgba(139,92,246,0.3)]
                    cursor-default
                  `}
                  style={{
                    transform: `translateY(${offsetY}px)`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                >
                  {item.text}
                </span>
              );
            })}
          </div>
        </div>

        {/* Mobile version */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <Link 
            href="/vendors"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold shadow-lg shadow-violet-500/25"
          >
            <Sparkles size={12} />
            Sell
          </Link>
        </div>
      </div>

      {/* Decorative gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
    </section>
  );
}
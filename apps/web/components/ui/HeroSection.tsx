"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Truck, Sparkles, Zap } from "lucide-react";
import {
  HERO_DEFAULT_GRADIENT,
  resolveHeroGradient,
} from "@/lib/heroGradients";
import { catalogApi } from "@/lib/api";
import Link from "next/link";

type HeroAnnouncement = {
  id: string;
  text: string;
  gradient: string;
  order: number;
};

export default function HeroSection() {
  const [announcements, setAnnouncements] = useState<
    HeroAnnouncement[]
  >([]);

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
              (item.gradient ?? "").trim() ||
                HERO_DEFAULT_GRADIENT
            ),
            order: Number.isFinite(item.order)
              ? item.order
              : index,
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
    if (!announcements.length) return [];

    return [...announcements, ...announcements];
  }, [announcements]);

  const items =
    marqueeItems.length > 0
      ? marqueeItems
      : [
          {
            id: "1",
            text:
              "🚚 NATIONWIDE DELIVERY ACROSS ALL 47 COUNTIES",
            gradient: "",
            order: 1,
          },
          {
            id: "2",
            text:
              "🔥 VERIFIED PRODUCTS • SECURE CHECKOUT • BEST PRICES",
            gradient: "",
            order: 2,
          },
        ];

  return (
    <section className="relative overflow-hidden border-b border-green-300 bg-gradient-to-r from-green-50 via-white to-emerald-50 py-3">

      {/* Background glow */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-green-300/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl items-center gap-5 px-4">

        {/* Nationwide Delivery */}
        <div className="hidden md:flex shrink-0 items-center gap-4">

          <div className="flex items-center gap-3 rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 px-6 py-3 shadow-2xl animate-pulse">

            <Truck
              size={24}
              className="text-white"
            />

            <div className="flex flex-col leading-none">
              <span className="text-[11px] uppercase tracking-widest text-white/90">
                We Deliver
              </span>

              <span className="text-lg font-black text-white">
                NATIONWIDE DELIVERY
              </span>
            </div>
          </div>

          <Link
            href="/vendors"
            className="flex items-center gap-2 rounded-full bg-[#009933] px-5 py-3 text-sm font-bold text-white shadow-xl transition hover:scale-105 hover:bg-[#006B2C]"
          >
            <Sparkles size={16} />
            Sell on NuruShop
          </Link>
        </div>

        {/* Marquee */}
        <div className="flex-1 overflow-hidden">

          <div className="flex animate-scroll whitespace-nowrap gap-8">

            {items.map((item, i) => (
              <div
                key={`${item.id}-${i}`}
                className="flex items-center gap-2 rounded-full bg-black/85 px-6 py-3 shadow-xl backdrop-blur-md"
              >
                <Zap
                  size={18}
                  className="text-yellow-400 animate-pulse"
                />

                <span
                  className="
                    text-sm
                    sm:text-lg
                    md:text-xl
                    font-black
                    tracking-wide
                    text-white
                  "
                >
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Button */}
        <div className="md:hidden shrink-0">

          <Link
            href="/vendors"
            className="rounded-full bg-[#009933] px-4 py-2 text-xs font-bold text-white shadow-lg"
          >
            Sell Here
          </Link>
        </div>
      </div>

      {/* Bottom Accent */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-green-500 via-yellow-400 to-green-500" />
    </section>
  );
}
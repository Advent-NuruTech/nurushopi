"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Zap } from "lucide-react";
import {
  HERO_DEFAULT_GRADIENT,
  resolveHeroGradient,
} from "@/lib/heroGradients";
import { catalogApi } from "@/lib/api";

type HeroAnnouncement = {
  id: string;
  text: string;
  gradient: string;
  order: number;
};

/** Constant scroll speed in px/second, independent of content length. */
const SCROLL_SPEED_PX_PER_SEC = 25;

const FALLBACK_ANNOUNCEMENTS: HeroAnnouncement[] = [
  {
    id: "1",
    text: "\u{1F69A}WE TRY TO GIVE THE BEST",
    gradient: "",
    order: 1,
  },
  {
    id: "2",
    text: "\u{1F525} VERIFIED PRODUCTS \u2022 SECURE CHECKOUT \u2022 BEST PRICES",
    gradient: "",
    order: 2,
  },
];

export default function HeroSection() {
  const [announcements, setAnnouncements] = useState<HeroAnnouncement[]>([]);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [scrollDuration, setScrollDuration] = useState(56);

  useEffect(() => {
    let cancelled = false;

    catalogApi
      .listHero()
      .then((data) => {
        if (cancelled) return;

        const cleaned = data.announcements
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

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const singleCopyWidth = track.scrollWidth / 2;
      if (singleCopyWidth > 0) {
        setScrollDuration(singleCopyWidth / SCROLL_SPEED_PX_PER_SEC);
      }
    };

    measure();
    const rafId = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measure);
    };
  }, [announcements]);

  const items = useMemo(
    () => (announcements.length ? announcements : FALLBACK_ANNOUNCEMENTS),
    [announcements]
  );

  return (
    <section className="relative w-full overflow-hidden border-b border-green-300 bg-black/85 py-3">
      <div className="w-full overflow-hidden">
        <div
          ref={trackRef}
          className="animate-scroll items-center"
          style={{ animationDuration: `${scrollDuration}s` }}
        >
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1 ? true : undefined}
              className="flex shrink-0 items-center"
            >
              {items.map((item) => (
                <div
                  key={`${copy}-${item.id}`}
                  className="flex shrink-0 items-center gap-2 px-6 sm:px-8"
                >
                  <Zap
                    aria-hidden="true"
                    size={18}
                    className="animate-pulse text-yellow-400"
                  />
                  <span className="text-sm font-black tracking-wide text-white sm:text-lg md:text-xl">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-green-500 via-yellow-400 to-green-500" />
    </section>
  );
}

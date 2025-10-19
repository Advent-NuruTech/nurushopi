"use client";

// nurushop/components/HeroSection.tsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function HeroSection() {
  const announcements = [
     "Welcome to NuruShop!",
    "Natural Remedies & Herbal Health",
    "E.G. White Books & Pioneer Writings",
    "Faith-Based Learning Resources",
    "Pure Oils, Herbs & Health Foods",
    "Affordable Spiritual & Wellness Products",
    "NuruShop — Health & Truth for Every Home",
    "Handpicked treasures from each category",
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % announcements.length);
    }, 4000); // 4 seconds per announcement
    return () => clearInterval(timer);
  }, [announcements.length]);

  return (
    <section className="relative w-full bg-gradient-to-r from-emerald-50 via-white to-sky-50 rounded-lg py-8 sm:py-10 px-4 mt-20 sm:mt-24 mb-6 overflow-hidden">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-center sm:text-left">
     
          {/* Animated announcement line */}
          <div className="relative h-6 mt-2 text-sm sm:text-base text-slate-700 font-medium overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.7 }}
                className="absolute w-full text-emerald-700"
              >
                {announcements[index]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

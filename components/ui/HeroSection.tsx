"use client";

import React from "react";

export default function HeroSection() {
  const announcements = [
    "Welcome to NuruShop!",
    "Natural Remedies & Herbal Health",
    "E.G. White Books & Pioneer Writings",
    "Faith-Based Learning Resources",
    "Pure Oils, Herbs & Health Foods",
    "All from trusted and satisfied sources ",
    "incase you dont find the product of your choice, please contact us directly so that we link you to a trusted seller",
    "Affordable Spiritual & Wellness Products",
    
    "NuruShop — Health & Truth for Every Home",
    "Handpicked treasures from each category",
  ];

  return (
    <section className="relative w-full bg-gradient-to-r from-emerald-50 via-white to-sky-50 
      rounded-lg py-4 sm:py-5 px-4 mt-12 sm:mt-14 mb-4 overflow-hidden">

      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        {/* Continuous horizontal scrolling text */}
        <div className="w-full overflow-hidden whitespace-nowrap">
          <div className="flex animate-marquee gap-12">
            {announcements.map((msg, i) => (
              <span
                key={i}
                className="text-blue-900 text-xl sm:text-2xl font-bold"
              >
                {msg}
              </span>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

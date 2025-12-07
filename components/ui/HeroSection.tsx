"use client";

import React from "react";

export default function HeroSection() {
  const announcements = [
    "Welcome to NuruShop!",
    "Natural Remedies & Herbal Health",
    "E.G. White Books & Pioneer Writings",
    "Faith-Based Learning Resources",
    "Pure Oils, Herbs & Health Foods",
    "All from trusted and satisfied sources",
    "Affordable Spiritual & Wellness Products",
    "Incase you don't find the product of your choice, please contact us directly so that we link you to a trusted seller",
    "If you want to sell your products with this platform, please reach out to us via phone call only 0759167209",
    "NuruShop — Health & Truth for Every Home",
    "Handpicked treasures from each category",
    "We are here to serve you",
  ];

  return (
    <section className="relative w-full rounded-lg py-3 px-4 mt-12 sm:mt-14 mb-4 overflow-hidden
      bg-gradient-to-r from-emerald-50 via-white to-sky-50">

      {/* Glowing Background Effects */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-300 opacity-20 blur-3xl rounded-full animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-sky-300 opacity-20 blur-3xl rounded-full animate-pulse"></div>

      {/* Floating Particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-black/10 rounded-full animate-float"
          style={{
            top: `${20 + i * 10}%`,
            left: `${10 + i * 15}%`,
            animationDuration: `${14 + i * 3}s`,
          }}
        ></div>
      ))}

      {/* Marquee Text */}
      <div className="relative max-w-5xl mx-auto flex items-center overflow-hidden py-1">
        <div className="flex whitespace-nowrap animate-scroll">
          {[...announcements, ...announcements].map((msg, i) => (
            <span
              key={i}
              className="text-blue-900 text-2xl sm:text-3xl font-extrabold mx-24 
                drop-shadow-md hover:scale-105 transition-transform duration-300
                bg-gradient-to-r from-blue-900 via-emerald-700 to-sky-800 
                bg-clip-text text-transparent"
              style={{
                textShadow: "0 0 20px rgba(59, 130, 246, 0.3)",
              }}
            >
              {msg}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

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
    "We are soon launching wholeselling services. if you wish to be a whole seller, contact us via phone call 0105178685",
    "We are here to serve you",
  ];

  // Array of distinct gradient colors for each announcement
  const gradients = [
    "from-rose-500 via-pink-500 to-purple-500",
    "from-fuchsia-500 via-indigo-500 to-blue-500",
    "from-teal-400 via-emerald-500 to-lime-400",
    "from-orange-400 via-yellow-400 to-amber-400",
    "from-cyan-400 via-sky-500 to-blue-400",
    "from-green-400 via-emerald-400 to-lime-300",
    "from-purple-500 via-pink-500 to-rose-400",
    "from-indigo-500 via-violet-500 to-fuchsia-400",
    "from-yellow-400 via-orange-400 to-red-400",
    "from-pink-400 via-rose-500 to-fuchsia-500",
    "from-sky-400 via-cyan-400 to-teal-400",
    "from-yellow-400 via-orange-400 to-red-400",
    "from-lime-400 via-green-400 to-emerald-400",
  ];

  return (
    <section
      className="
        relative
        w-full
        rounded-lg
        py-3
        px-4
        mt-12
        sm:mt-14
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
      {/* Soft Background Accents */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-emerald-400/20 dark:bg-emerald-600/10 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-sky-400/20 dark:bg-sky-600/10 blur-3xl rounded-full" />

      {/* Floating Particles */}
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

      {/* Marquee Text */}
      <div className="relative max-w-5xl mx-auto flex items-center overflow-hidden py-1">
        <div className="flex whitespace-nowrap animate-scroll">
          {[...announcements, ...announcements].map((msg, i) => {
            const gradient = gradients[i % gradients.length];
            return (
              <span
                key={i}
                className={`
                  mx-24
                  text-2xl
                  sm:text-3xl
                  font-extrabold
                  transition-transform
                  duration-300
                  hover:scale-110
                  bg-gradient-to-r ${gradient}
                  bg-clip-text
                  text-transparent
                `}
                style={{
                  // Random slight vertical offset per line for modern dynamic feel
                  transform: `translateY(${Math.sin(i * 2) * 3}px)`,
                }}
              >
                {msg}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

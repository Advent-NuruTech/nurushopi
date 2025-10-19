"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface Banner {
  id: number;
  image: string;
  title?: string;
  subtitle?: string;
  link?: string;
}

const banners: Banner[] = [
  {
    id: 1,
    image: "/images/banner1.jpg",
    title: "Welcome to NuruShop",
    subtitle: "Quality products at affordable prices",
    link: "/products",
  },
  {
    id: 2,
    image: "/images/banner2.jpg",
    title: "Shop the Latest Trends",
    subtitle: "Discover what's new in store today",
    link: "/new-arrivals",
  },
  {
    id: 3,
    image: "/images/banner3.jpg",
    title: "Fast Delivery",
    subtitle: "Get your orders delivered right to your door",
    link: "/delivery-info",
  },
];

export default function Banners() {
  const [current, setCurrent] = useState(0);

  // Auto-rotate every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[350px] sm:h-[450px] overflow-hidden rounded-2xl shadow-lg mt-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={banners[current].id}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <Image
            src={banners[current].image}
            alt={banners[current].title || "Banner"}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center text-white px-4">
            <h2 className="text-3xl sm:text-5xl font-bold drop-shadow-lg mb-3">
              {banners[current].title}
            </h2>
            <p className="text-lg sm:text-xl opacity-90 mb-6">
              {banners[current].subtitle}
            </p>
            {banners[current].link && (
              <a
                href={banners[current].link}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full transition"
              >
                Shop Now
              </a>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Small dots for manual navigation */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {banners.map((banner, index) => (
          <button
            key={banner.id}
            onClick={() => setCurrent(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === current ? "bg-white w-6" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";

interface Product {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  shortDescription?: string;
  description?: string;
}

interface FeaturedSectionProps {
  products: Product[];
}

export default function FeaturedSection({ products }: FeaturedSectionProps) {
  const { addToCart } = useCart();
  const [currentCategory, setCurrentCategory] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const categories = [
    "foods",
    "herbs",
    "egw",
    "pioneers",
    "authors",
    "oils",
    "covers",
    "bibles",
    "songbooks",
  ];

  const featuredByCategory = categories
    .map((cat) => ({
      category: cat,
      items: products
        .filter((p) => p.category?.toLowerCase() === cat)
        .slice(-2),
    }))
    .filter((group) => group.items.length > 0);

  // Auto-slide every 8s
  useEffect(() => {
    if (!featuredByCategory.length) return;
    const timer = setInterval(() => {
      setCurrentCategory((prev) => (prev + 1) % featuredByCategory.length);

      // Scroll to start of next category
      if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    }, 8000);
    return () => clearInterval(timer);
  }, [featuredByCategory.length]);

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
    });
  };

  // Drag scrolling
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const start = (e: any) => {
      isDown = true;
      startX =
        "touches" in e ? e.touches[0].pageX - container.offsetLeft : e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    };

    const stop = () => (isDown = false);

    const move = (e: any) => {
      if (!isDown) return;
      e.preventDefault();
      const x =
        "touches" in e ? e.touches[0].pageX - container.offsetLeft : e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollLeft - walk;
    };

    container.addEventListener("mousedown", start);
    container.addEventListener("mouseleave", stop);
    container.addEventListener("mouseup", stop);
    container.addEventListener("mousemove", move);

    container.addEventListener("touchstart", start);
    container.addEventListener("touchend", stop);
    container.addEventListener("touchmove", move);

    return () => {
      container.removeEventListener("mousedown", start);
      container.removeEventListener("mouseleave", stop);
      container.removeEventListener("mouseup", stop);
      container.removeEventListener("mousemove", move);
      container.removeEventListener("touchstart", start);
      container.removeEventListener("touchend", stop);
      container.removeEventListener("touchmove", move);
    };
  }, []);

  if (!featuredByCategory.length)
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        Loading featured products...
      </div>
    );

  return (
    <section className="relative w-full px-3 sm:px-6 py-10 sm:py-12 overflow-hidden bg-white dark:bg-black transition-colors">
      <div className="relative max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={featuredByCategory[currentCategory].category}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="w-full"
          >
            {/* Header */}
            <div className="flex justify-between items-center w-full px-2 sm:px-6 mb-4">
              <h1 className="text-xl sm:text-2xl font-semibold capitalize text-blue-700 dark:text-blue-400">
                {featuredByCategory[currentCategory].category.replace(
                  /egw/i,
                  "E.G. White Writings"
                )}
              </h1>
              <Link href={`/${featuredByCategory[currentCategory].category}` as any}>
                <Button
                  variant="outline"
                  className="text-blue-700 dark:text-blue-300 border-blue-600 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:text-white"
                >
                  View All →
                </Button>
              </Link>
            </div>

            {/* Scrollable products with snapping */}
            <div
              ref={scrollRef}
              className="flex gap-3 sm:gap-4 overflow-x-auto px-1 sm:px-3 scrollbar-hide cursor-grab active:cursor-grabbing snap-x snap-mandatory"
            >
              {featuredByCategory[currentCategory].items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  className="min-w-[180px] sm:min-w-[200px] 
                    bg-white dark:bg-gray-900 
                    rounded-xl shadow-md dark:shadow-gray-800 
                    hover:shadow-lg dark:hover:shadow-gray-700 
                    flex flex-col overflow-hidden transition-all snap-start"
                >
                  <Link href={`/products/${item.id}`} className="flex-grow block">
                    <div className="relative w-full h-40 sm:h-44 bg-gray-100 dark:bg-gray-800 rounded-t-xl overflow-hidden">
                      <Image
                        src={item.image || "/assets/logo.jpg"}
                        alt={item.name}
                        fill
                        className="object-contain"
                      />
                    </div>

                    <div className="p-2 sm:p-3 text-center">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {item.shortDescription ||
                          "A premium item designed to uplift your body, mind, and spirit."}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center justify-between px-2 sm:px-3 pb-2">
                    <p className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                      KSh {item.price.toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddToCart(item);
                      }}
                    >
                      +
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Indicators */}
        <div className="flex justify-center mt-4 space-x-2">
          {featuredByCategory.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentCategory(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentCategory
                  ? "bg-blue-600 dark:bg-blue-400 scale-110"
                  : "bg-gray-300 dark:bg-gray-700 hover:bg-blue-400 dark:hover:bg-blue-300"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

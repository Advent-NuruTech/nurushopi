"use client";

import { useEffect, useState, useRef, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/ui/SectionHeader";
import { useCart } from "@/context/CartContext";
import { formatCategoryLabel } from "@/lib/categoryUtils";
import { formatPrice } from "@/lib/formatPrice";
import { getDiscountPercent, getOriginalPrice, getSellingPrice } from "@/lib/pricing";

interface Product {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  originalPrice?: number;
  sellingPrice?: number;
  shortDescription?: string;
  description?: string;
}

interface Category {
  name: string;
  slug: string;
}

interface FeaturedSectionProps {
  products: Product[];
  categories?: Category[];
}

export default function FeaturedSection({ products, categories = [] }: FeaturedSectionProps) {
  const { addToCart } = useCart();
  const [currentCategory, setCurrentCategory] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const derivedCategories: Category[] = Array.from(
    new Set(
      products
        .map((p) => p.category?.toLowerCase().trim())
        .filter((c): c is string => Boolean(c))
    )
  ).map((slug) => ({ slug, name: formatCategoryLabel(slug) }));

  const categoryList = categories.length ? categories : derivedCategories;

  const featuredByCategory = categoryList
    .map((cat) => ({
      category: cat,
      items: products.filter((p) => p.category?.toLowerCase() === cat.slug),
    }))
    .filter((group) => group.items.length > 0);

  const handleAddToCart = (product: Product) => {
    const sellingPrice = getSellingPrice(product);
    addToCart({
      id: product.id,
      name: product.name,
      price: sellingPrice,
      quantity: 1,
      image: product.image,
    });
  };

  // -----------------------------
  // Automatic & Manual Infinite Scroll
  // -----------------------------
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    // Manual drag handlers
    const start = (e: MouseEvent | TouchEvent) => {
      isDown = true;
      startX =
        e instanceof TouchEvent
          ? e.touches[0].pageX - container.offsetLeft
          : (e as MouseEvent).pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    };

    const stop = () => (isDown = false);

    const move = (e: MouseEvent | TouchEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x =
        e instanceof TouchEvent
          ? e.touches[0].pageX - container.offsetLeft
          : (e as MouseEvent).pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollLeft - walk;

      // Optional: wrap around manually
      if (container.scrollLeft >= container.scrollWidth / 2) {
        container.scrollLeft = 0;
      }
      if (container.scrollLeft <= 0) {
        container.scrollLeft = container.scrollWidth / 2;
      }
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

  const categorySlug = featuredByCategory[currentCategory].category.slug;

  return (
    <section className="relative w-full px-0 sm:px-6 py-4 sm:py-12 overflow-hidden bg-white dark:bg-black transition-colors">
      <div className="relative max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={featuredByCategory[currentCategory].category.slug}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="w-full"
          >
            {/* Header */}
            <div className="w-full px-2 sm:px-6 mb-3">
              <SectionHeader
                title={
                  featuredByCategory[currentCategory].category.name ||
                  formatCategoryLabel(categorySlug)
                }
                href={`/shop?category=${encodeURIComponent(categorySlug)}`}
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto px-2 sm:px-6 pb-2 scrollbar-hide">
              {featuredByCategory.map((group, idx) => (
                <button
                  key={group.category.slug}
                  onClick={() => setCurrentCategory(idx)}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap border transition ${
                    idx === currentCategory
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                  }`}
                >
                  {group.category.name || formatCategoryLabel(group.category.slug)}
                </button>
              ))}
            </div>

            {/* Infinite scroll container */}
            <div
              ref={scrollRef}
              className="flex gap-3 sm:gap-4 overflow-x-auto px-1 sm:px-3 scrollbar-hide scroll-smooth cursor-grab active:cursor-grabbing snap-x snap-mandatory"
            >
              {/* Duplicate items to allow infinite effect */}
              {[
                ...featuredByCategory[currentCategory].items,
                ...featuredByCategory[currentCategory].items,
              ].map((item, idx) => {
                const discountPercent = getDiscountPercent(item);
                const originalPrice = getOriginalPrice(item);
                const sellingPrice = getSellingPrice(item);
                return (
                  <motion.div
                    key={`${item.id}-${idx}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    className="relative min-w-[180px] sm:min-w-[200px] 
                      bg-white dark:bg-gray-900 
                      rounded-xl shadow-md dark:shadow-gray-800 
                      hover:shadow-lg dark:hover:shadow-gray-700 
                      flex flex-col overflow-hidden transition-all snap-start"
                  >
                    {discountPercent && (
                      <div className="absolute top-2 right-2 z-10 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                        {discountPercent}% OFF
                      </div>
                    )}
                    <Link href={`/products/${item.id}`} className="flex-grow block">
                      <div className="relative w-full h-40 sm:h-44 bg-gray-100 dark:bg-gray-800 rounded-t-xl overflow-hidden">
                        <Image
                          src={item.image || "/assets/logo.jpg"}
                          alt={item.name}
                          fill
                          className="object-contain"
                          placeholder="blur"
                          blurDataURL="/assets/logo.jpg"
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
                      <div className="flex flex-col">
                        {discountPercent && originalPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {formatPrice(originalPrice)}
                          </span>
                        )}
                        <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                          {formatPrice(sellingPrice)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          handleAddToCart(item);
                        }}
                      >
                        +
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
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

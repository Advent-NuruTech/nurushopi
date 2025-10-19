"use client";

import { useEffect, useState } from "react";
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

  const categories = [
    "food",
    "herbs",
    "egw",
    "pioneers",
    "authors",
    "oils",
    "covers",
    "bibles",
    "songbooks",
  ];

  // ✅ Only latest 2 per category
  const featuredByCategory = categories
    .map((cat) => ({
      category: cat,
      items: products
        .filter((p) => p.category?.toLowerCase() === cat)
        .slice(-2), // ✅ only latest 2 items
    }))
    .filter((group) => group.items.length > 0);

  // Auto-slide every 8 seconds
  useEffect(() => {
    if (featuredByCategory.length === 0) return;
    const timer = setInterval(() => {
      setCurrentCategory((prev) => (prev + 1) % featuredByCategory.length);
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

  if (!featuredByCategory.length)
    return (
      <div className="text-center py-20 text-gray-500">
        Loading featured products...
      </div>
    );

  return (
    <section className="relative w-full bg-gradient-to-b from-blue-50 via-white to-blue-100 px-3 sm:px-6 py-16 overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-blue-100 via-white to-blue-50 -z-10" />

      <div className="relative max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={featuredByCategory[currentCategory].category}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="w-full"
          >
            {/* Header */}
            <div className="flex justify-between items-center w-full px-4 sm:px-8 mb-5">
              <h1 className="text-xl sm:text-2xl font-semibold capitalize text-blue-700">
                {featuredByCategory[currentCategory].category.replace(
                  /egw/i,
                  "E.G. White Writings"
                )}
              </h1>
              <Link href={`/${featuredByCategory[currentCategory].category}` as any}>
                <Button
                  variant="outline"
                  className="text-blue-700 border-blue-600 hover:bg-blue-600 hover:text-white"
                >
                  View All →
                </Button>
              </Link>
            </div>

            {/* ✅ Single Row Scrollable */}
            <div className="flex gap-4 sm:gap-5 overflow-x-auto px-3 sm:px-5 scrollbar-hide">
              {featuredByCategory[currentCategory].items.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.03 }}
                  className="min-w-[180px] sm:min-w-[200px] bg-white rounded-xl shadow-md hover:shadow-lg flex flex-col overflow-hidden transition-all"
                >
                  <Link href={`/products/${item.id}`} className="flex-grow block">
                    <div className="relative w-full h-40 sm:h-44 bg-gray-50 rounded-t-xl overflow-hidden">
                      <Image
                        src={item.image || "/images/placeholder.png"}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="p-3 text-center">
                      <h4 className="font-semibold text-gray-800 text-sm line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {item.shortDescription ||
                          "A premium item designed to uplift your body, mind, and spirit."}
                      </p>
                    </div>
                  </Link>

                  {/* ✅ Price Left | Add Button Right */}
                  <div className="flex items-center justify-between px-3 pb-3">
                    <p className="text-blue-600 font-bold text-sm">
                      KSh {item.price.toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
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

        {/* Navigation Dots */}
        <div className="flex justify-center mt-6 space-x-3">
          {featuredByCategory.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentCategory(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentCategory
                  ? "bg-blue-600 scale-110"
                  : "bg-gray-300 hover:bg-blue-400"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

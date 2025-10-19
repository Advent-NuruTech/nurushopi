"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
  description?: string; // Allow full description
}

interface FeaturedSectionProps {
  products: Product[];
}

export default function FeaturedSection({ products }: FeaturedSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const { addToCart } = useCart();

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

  const featuredByCategory = categories.map((cat) => ({
    category: cat,
    items: products
      .filter((p) => p.category?.toLowerCase() === cat)
      .slice(0, 8),
  }));

  // Auto-slide effect
  useEffect(() => {
    if (isScrolling) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % 8);
    }, 4000);
    return () => clearInterval(timer);
  }, [isScrolling]);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => setIsScrolling(false), 1500);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.image,
    });
  };

  return (
    <section className="relative w-full min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-100 flex flex-col justify-center items-center px-3 sm:px-6 py-16 overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-blue-100 via-white to-blue-50 -z-10" />

      <div className="flex flex-col gap-14 w-full max-w-7xl">
        {featuredByCategory.map(
          (group) =>
            group.items.length > 0 && (
              <div key={group.category} className="w-full">
                {/* Category Title + View All */}
                <div className="flex justify-between items-center mb-5 px-2 sm:px-6">
                  <h3 className="text-xl sm:text-2xl font-semibold capitalize text-blue-700">
                    {group.category.replace(/egw/i, "E.G. White Writings")}
                  </h3>
                  <Link href={{ pathname: `/${group.category}` }}>
                    <Button
                      variant="outline"
                      className="text-blue-700 border-blue-600 hover:bg-blue-600 hover:text-white transition"
                    >
                      View All →
                    </Button>
                  </Link>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                  {group.items.map((item) => (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.03 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white rounded-xl shadow-md hover:shadow-lg flex flex-col overflow-hidden transition-all duration-300"
                    >
                      <Link
                        href={`/products/${item.id}`}
                        className="flex-grow block"
                      >
                        <div className="relative w-full h-40 sm:h-56 bg-white">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                          />
                        </div>

                        <div className="p-3 text-center">
                          <h4 className="font-semibold text-gray-800 text-sm sm:text-base line-clamp-1">
                            {item.name}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                            {item.shortDescription ||
                              "A premium item to uplift your faith and wellbeing."}
                          </p>
                        </div>
                      </Link>

                      {/* Price + Add Button (same line) */}
                      <div className="flex justify-between items-center px-3 pb-3">
                        <p className="text-blue-600 font-bold">
                          KSh {item.price.toLocaleString()}
                        </p>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(item);
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
        )}
      </div>

      {/* CTA Button */}
      <div className="mt-16 text-center">
        <Link href="/shop">
          <Button
            size="lg"
            className="px-8 py-3 text-lg rounded-full shadow-md bg-blue-700 hover:bg-blue-800 text-white"
          >
            Explore Full Collection
          </Button>
        </Link>
      </div>
    </section>
  );
}

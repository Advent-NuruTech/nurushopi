"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { formatCategoryLabel } from "@/lib/categoryUtils";

interface Product {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const { addToCart } = useCart();

  const derivedCategories: Category[] = Array.from(
    new Set(
      products
        .map((p) => p.category?.toLowerCase().trim())
        .filter((c): c is string => Boolean(c))
    )
  ).map((slug) => ({ slug, name: formatCategoryLabel(slug) }));

  const categoryList = categories.length ? categories : derivedCategories;

  const featuredByCategory = categoryList.map((cat) => ({
    category: cat,
    items: products.filter((p) => p.category?.toLowerCase() === cat.slug).slice(0, 8),
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
    <section className="relative w-full px-0 sm:px-1 py-4 bg-white dark:bg-black transition-colors">
      <div className="flex flex-col gap-14 w-full max-w-7xl mx-auto">
        {featuredByCategory.map(
          (group) =>
            group.items.length > 0 && (
              <div key={group.category.slug} className="w-full">
                {/* Category Title + View All */}
                <div className="flex justify-between items-center mb-5 px-1 sm:px-3">
                  <h3 className="text-xl sm:text-2xl font-semibold capitalize text-blue-700 dark:text-blue-400">
                    {group.category.name || formatCategoryLabel(group.category.slug)}
                  </h3>
                  <Link href={{ pathname: "/shop", query: { category: group.category.slug } }}>
                    <Button
                      variant="outline"
                      className="text-blue-700 dark:text-blue-300 border-blue-600 dark:border-blue-400 hover:bg-blue-600 hover:text-white dark:hover:text-white"
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
                      className="bg-white dark:bg-gray-900 rounded-xl shadow-md dark:shadow-gray-700 hover:shadow-lg dark:hover:shadow-gray-600 flex flex-col overflow-hidden transition-all duration-300"
                    >
                      <Link href={`/products/${item.id}`} className="flex-grow block">
                        <div className="relative w-full h-40 sm:h-56 bg-white dark:bg-gray-800">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                          />
                        </div>

                        <div className="p-3 text-center">
                          <h4 className="font-semibold text-black dark:text-white text-sm sm:text-base line-clamp-1">
                            {item.name}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {item.shortDescription ||
                              "A premium item to uplift your faith and wellbeing."}
                          </p>
                        </div>
                      </Link>

                      {/* Price + Add Button */}
                      <div className="flex justify-between items-center px-3 pb-3">
                        <p className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                          KSh {item.price.toLocaleString()}
                        </p>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
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
            className="px-8 py-3 text-lg rounded-full shadow-md bg-blue-800 hover:bg-blue-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:hover:text-black transition"
          >
            Explore Full Collection
          </Button>
        </Link>
      </div>
    </section>
  );
}

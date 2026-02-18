"use client";

import { motion } from "framer-motion";
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
  createdAt?: number | string | null;
}

interface Category {
  name: string;
  slug: string;
}

interface FeaturedSectionProps {
  products: Product[];
  categories?: Category[];
}

const FEATURED_LIMIT = 8;
const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function toMillis(value: Product["createdAt"]): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export default function FeaturedSection({ products, categories = [] }: FeaturedSectionProps) {
  const { addToCart } = useCart();

  const derivedCategories: Category[] = Array.from(
    new Set(
      products
        .map((p) => p.category?.toLowerCase().trim())
        .filter((c): c is string => Boolean(c))
    )
  ).map((slug) => ({ slug, name: formatCategoryLabel(slug) }));

  const categoryList = categories.length ? categories : derivedCategories;

  const featuredByCategory = categoryList
    .map((cat) => {
      const matching = products
        .filter((p) => p.category?.toLowerCase() === cat.slug)
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

      return {
        category: cat,
        totalCount: matching.length,
        items: matching.slice(0, FEATURED_LIMIT),
      };
    })
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

  return (
    <section className="relative w-full px-0 sm:px-1 py-4 bg-white dark:bg-black transition-colors">
      <div className="flex flex-col gap-14 w-full max-w-7xl mx-auto">
        {featuredByCategory.map((group) => (
          <div key={group.category.slug} className="w-full">
            <div className="mb-5 px-1 sm:px-3">
              <SectionHeader
                title={group.category.name || formatCategoryLabel(group.category.slug)}
                href={`/shop?category=${group.category.slug}`}
                showViewAll={group.totalCount > FEATURED_LIMIT}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {group.items.map((item) => {
                const discountPercent = getDiscountPercent(item);
                const originalPrice = getOriginalPrice(item);
                const sellingPrice = getSellingPrice(item);
                const isNew = Date.now() - toMillis(item.createdAt) <= NEW_WINDOW_MS;

                return (
                  <motion.div
                    key={item.id}
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.3 }}
                    className="relative bg-white dark:bg-gray-900 rounded-xl shadow-md dark:shadow-gray-700 hover:shadow-lg dark:hover:shadow-gray-600 flex flex-col overflow-hidden transition-all duration-300"
                  >
                    {discountPercent && (
                      <div className="absolute top-2 right-2 z-10 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                        {discountPercent}% OFF
                      </div>
                    )}
                    {isNew && (
                      <div className="absolute top-2 left-2 z-10 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                        NEW
                      </div>
                    )}
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

                    <div className="flex justify-between items-center px-3 pb-3">
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
                        onClick={(e) => {
                          e.stopPropagation();
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
          </div>
        ))}
      </div>

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

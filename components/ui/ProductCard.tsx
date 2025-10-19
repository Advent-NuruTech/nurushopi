"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ProductCard({ product }: { product: Product }) {
  const [mainImage, setMainImage] = useState<string>("");
  const { addToCart } = useCart();

  // ✅ Set main image safely
  useEffect(() => {
    if (product) {
      setMainImage(product.images?.[0] || "/images/placeholder.png");
    }
  }, [product]);

  // ✅ Handle add to cart
  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: mainImage,
    });
  };

  // ✅ Shorten product description
  const shortDesc =
    product.shortDescription?.split(" ").slice(0, 15).join(" ") +
    (product.shortDescription &&
    product.shortDescription.split(" ").length > 15
      ? "..."
      : "");

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-900 rounded-xl shadow-sm hover:shadow-md flex flex-col overflow-hidden transition-all duration-300 w-full h-full"
    >
      {/* ✅ Product Link */}
      <Link href={`/products/${product.id}`} className="flex-grow block">
        {/* ✅ Product Image */}
        <div className="relative w-full h-44 sm:h-48 bg-white">
          <Image
            src={mainImage}
            alt={product.name}
            fill
            className="object-contain p-2"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />
        </div>

        {/* ✅ Product Info */}
        <div className="p-3 text-center">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm line-clamp-1">
            {product.name}
          </h4>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {shortDesc || "A quality product from NuruShop."}
          </p>
        </div>
      </Link>

      {/* ✅ Price and Add Button */}
      <div className="flex items-center justify-between p-3 border-t border-gray-100 dark:border-gray-800">
        <p className="text-blue-600 font-bold">
          KSh {product.price.toLocaleString()}
        </p>

        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-8 h-8 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            handleAddToCart();
          }}
        >
          <Plus size={16} />
        </Button>
      </div>
    </motion.div>
  );
}

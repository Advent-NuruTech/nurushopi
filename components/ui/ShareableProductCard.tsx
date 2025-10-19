"use client";

import React from "react";
import ProductCard from "./ProductCard";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { Product } from "@/lib/types";

interface ShareableProductCardProps {
  product: Product;
}

export default function ShareableProductCard({ product }: ShareableProductCardProps) {
  // ✅ Handle product sharing
  const handleShare = async () => {
    const productUrl = `${window.location.origin}/products/${product.id}`;
    const shareData = {
      title: product.name,
      text: `${product.name} - KSh ${product.price}\n${
        product.shortDescription || "Check out this great product from NuruShop!"
      }`,
      url: productUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        console.log("✅ Product shared successfully");
      } else {
        await navigator.clipboard.writeText(productUrl);
        alert("📋 Product link copied to clipboard!");
      }
    } catch (err) {
      console.error("❌ Share failed:", err);
      alert("Sharing failed. Please try again manually.");
    }
  };

  return (
    <div className="relative group">
      {/* 🛍️ Product Card */}
      <ProductCard product={product} />

      {/* 🔗 Share Button (floating top-right) */}
      <div className="absolute top-2 right-2 z-10 opacity-90 group-hover:opacity-100 transition">
        <Button
          size="sm" // ✅ valid size prop
          variant="outline"
          className="p-2 rounded-full bg-white/90 dark:bg-gray-800/90 
                     backdrop-blur-sm shadow-md hover:bg-white 
                     dark:hover:bg-gray-700 transition flex items-center justify-center w-8 h-8"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleShare();
          }}
          aria-label="Share product"
        >
          <Share2 size={16} className="text-gray-700 dark:text-gray-200" />
        </Button>
      </div>
    </div>
  );
}

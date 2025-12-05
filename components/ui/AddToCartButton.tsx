"use client";

import React from "react";
import { useCart } from "@/context/CartContext";
import { ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

// ✅ Sabbath closing logic OUTSIDE the component
export function isSabbathClosed() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "long",
  });

  const parts = formatter.formatToParts(now);

  const day = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value);

  const isFridayAfterSix = day === "Friday" && hour >= 18;
  const isSaturdayBeforeSix = day === "Saturday" && hour < 18;

  return isFridayAfterSix || isSaturdayBeforeSix;
}

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
  };
}

const AddToCartButton: React.FC<AddToCartButtonProps> = ({ product }) => {
  const { addToCart } = useCart();
  const sabbathClosed = isSabbathClosed();

  return (
    <motion.button
      whileTap={{ scale: sabbathClosed ? 1 : 0.95 }}
      disabled={sabbathClosed}
      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition 
        ${sabbathClosed 
          ? "bg-gray-400 cursor-not-allowed" 
          : "bg-green-600 hover:bg-green-700 text-white"
        }`}
      onClick={() => {
        if (!sabbathClosed) {
          addToCart({ ...product, quantity: 1 });
        }
      }}
    >
      <ShoppingCart className="w-4 h-4" />
      {sabbathClosed ? "Closed for Sabbath" : "Add to Cart"}
    </motion.button>
  );
};

export default AddToCartButton;

"use client";

import React from "react";
import { useCart } from "@/context/CartContext";
import { ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

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

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
      onClick={() => addToCart({ ...product, quantity: 1 })}
    >
      <ShoppingCart className="w-4 h-4" />
      Add to Cart
    </motion.button>
  );
};

export default AddToCartButton;

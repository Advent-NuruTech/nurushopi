"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface CartIconProps {
  count?: number;
}

export default function CartIcon({ count = 0 }: CartIconProps) {
  const [animate, setAnimate] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Trigger subtle animation when count changes
  useEffect(() => {
    if (count > 0) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(timer);
    }
  }, [count]);

  // 🔥 Firebase auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <Link href="/checkout" className="relative group">
      <motion.div
        whileHover={{ scale: 1.1 }}
        animate={animate ? { scale: [1, 1.2, 1] } : {}}
        className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-all"
      >
        <ShoppingCart className="w-6 h-6 text-primary" />
      </motion.div>

      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
          {count}
        </span>
      )}

      {!isSignedIn && (
        <span className="absolute top-7 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 hidden group-hover:block">
          Sign in to save cart
        </span>
      )}
    </Link>
  );
}

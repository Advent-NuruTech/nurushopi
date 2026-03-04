"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function AuthHeader() {
  return (
    <header className="w-full px-6 py-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative w-24 h-24 rounded-full overflow-hidden shadow-2xl ring-4 ring-blue-500 dark:ring-blue-400 flex items-center justify-center"
        >
          <Image
            src="/assets/logo.jpg"
            alt="Nurushop Logo"
            fill
            className="object-contain"
          />
        </motion.div>
      </div>
      <div className="mt-4 text-center">
        <h1 className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Nurushop
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm">
          marketplace for health and truth
        </p>
      </div>
    </header>
  );
}
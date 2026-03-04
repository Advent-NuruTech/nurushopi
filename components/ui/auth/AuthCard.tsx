"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  icon: ReactNode;
}

export default function AuthCard({ children, title, subtitle, icon }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-md w-full"
    >
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
        {/* Top Gradient */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

        <div className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 transition-colors">
              {icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 transition-colors">{title}</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors">{subtitle}</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </motion.div>
  );
}
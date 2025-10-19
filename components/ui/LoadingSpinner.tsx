"use client";

import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  size?: number;
  text?: string;
}

export default function LoadingSpinner({ size = 40, text }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4 text-primary">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          ease: "linear",
          repeat: Infinity,
        }}
        style={{
          width: size,
          height: size,
          border: `${size * 0.12}px solid rgba(0,0,0,0.1)`,
          borderTop: `${size * 0.12}px solid currentColor`,
          borderRadius: "50%",
        }}
      />
      {text && (
        <span className="mt-3 text-sm font-medium text-gray-600 animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
}

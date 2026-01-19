"use client";

import { motion, AnimatePresence } from "framer-motion";

interface StatusMessageProps {
  error: string;
  success: string;
  onCloseError: () => void;
  onCloseSuccess: () => void;
}

export default function StatusMessage({
  error,
  success,
  onCloseError,
  onCloseSuccess,
}: StatusMessageProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
        >
          <div className="w-2 h-full bg-red-500 rounded"></div>
          <div className="flex-1">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={onCloseError}
            className="text-red-500 hover:text-red-700"
            type="button"
          >
            ×
          </button>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2"
        >
          <div className="w-2 h-full bg-green-500 rounded"></div>
          <div className="flex-1">
            <p className="text-green-700 text-sm font-medium">{success}</p>
          </div>
          <button
            onClick={onCloseSuccess}
            className="text-green-500 hover:text-green-700"
            type="button"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
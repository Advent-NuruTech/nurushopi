"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface CategoryFilterProps {
  categories: string[];
  onSelect: (category: string | null) => void;
}

export default function CategoryFilter({ categories, onSelect }: CategoryFilterProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (category: string) => {
    const newValue = selected === category ? null : category;
    setSelected(newValue);
    onSelect(newValue);
  };

  return (
    <motion.div
      className="flex flex-wrap gap-2 items-center justify-center py-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {categories.map((cat) => (
        <motion.button
          key={cat}
          onClick={() => handleSelect(cat)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`px-4 py-1 rounded-full text-sm font-medium border transition ${
            selected === cat
              ? "bg-primary text-white border-primary"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          {cat}
        </motion.button>
      ))}
    </motion.div>
  );
}

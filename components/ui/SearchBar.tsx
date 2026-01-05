"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import Image from "next/image";

interface SearchBarProps {
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
}

interface SearchResult {
  id: string;
  name: string;
  type: "product" | "book" | "remedy";
  category: string;
  price?: number;
  description?: string;
  image?: string;
}

export default function SearchBar({
  showSearch,
  setShowSearch,
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  const router = useRouter();

  /* ---------------- Close search on outside click / scroll ---------------- */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;

      if (
        showSearch &&
        searchBoxRef.current &&
        !searchBoxRef.current.contains(target) &&
        searchButtonRef.current &&
        !searchButtonRef.current.contains(target)
      ) {
        setShowSearch(false);
      }
    };

    const handleScroll = () => {
      if (showSearch) setShowSearch(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [showSearch, setShowSearch]);

  /* ---------------- Firestore search ---------------- */
  const searchProducts = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim().toLowerCase();

    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);

    try {
      const productsRef = collection(db, "products");

      const q = query(
        productsRef,
        where("name_lowercase", ">=", trimmed),
        where("name_lowercase", "<=", trimmed + "\uf8ff"),
        limit(10)
      );

      const snapshot = await getDocs(q);

      const results: SearchResult[] = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          name: data.name,
          type: data.type ?? "product",
          category: data.category ?? "",
          price: data.price,
          description: data.description,
          image:
            data.imageUrl ??
            (Array.isArray(data.images) ? data.images[0] : undefined),
        };
      });

      setSearchResults(results);
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ---------------- Debounce ---------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);

    return () => clearTimeout(t);
  }, [searchQuery, searchProducts]);

  /* ---------------- Navigation (FIXED) ---------------- */
  const handleSearchResultClick = (result: SearchResult) => {
    setSearchQuery("");
    setShowSearch(false);

    const path = `/products/${result.id}` as Route;
    router.push(path);
  };

  const formatPrice = (price: number) =>
    `KSh ${price.toLocaleString("en-KE")}`;

  /* ---------------- UI ---------------- */
  return (
    <>
      {/* Search Button */}
      <button
        ref={searchButtonRef}
        onClick={() => setShowSearch(!showSearch)}
        aria-label="Search"
        aria-expanded={showSearch}
        className="p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition"
      >
        <Search size={22} />
      </button>

      {/* Search Dropdown */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            ref={searchBoxRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-1/2 -translate-x-1/2 w-[90%] md:w-[60%] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mt-2 z-50"
          >
            {/* Input */}
            <div className="flex items-center px-4 py-2">
              <Search size={18} className="text-gray-500" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, books, or remedies..."
                className="flex-1 bg-transparent outline-none px-3 py-2 text-gray-700 dark:text-gray-300"
              />
              {isLoading && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Results */}
            {searchResults.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleSearchResultClick(result)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full px-4 py-3 flex gap-3 text-left transition rounded-md ${
                      activeIndex === index
                        ? "bg-blue-50 dark:bg-gray-700"
                        : "hover:bg-blue-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {result.image ? (
                      <div className="relative w-14 h-14 rounded-md overflow-hidden border">
                        <Image
                          src={result.image}
                          alt={result.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-xs text-gray-400 rounded-md">
                        No Image
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 dark:text-gray-100">
                        {result.name}
                      </div>

                      {result.description && (
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {result.description}
                        </div>
                      )}

                      {result.price && (
                        <div className="text-sm font-bold text-green-600 mt-1">
                          {formatPrice(result.price)}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty */}
            {!isLoading && searchQuery && searchResults.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No results found for &quot;{searchQuery}&quot;
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

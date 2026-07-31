"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { catalogApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import Image from "next/image";

interface SearchResult {
  id: string;
  name: string;
  type: "product" | "book" | "remedy";
  category: string;
  price?: number;
  sellingPrice?: number;
  originalPrice?: number;
  description?: string;
  image?: string;
}

// Define the API params type
interface ListProductsParams {
  search?: string;
  pageSize?: number;
  signal?: AbortSignal;
}

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  /* ---------------- Close search on outside click ---------------- */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && searchBoxRef.current && !searchBoxRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  /* ---------------- API search with AbortController ---------------- */
  const searchProducts = useCallback(async (searchTerm: string) => {
    const trimmed = searchTerm.trim();

    if (!trimmed) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const abortController = new AbortController();

    try {
      const params: ListProductsParams = {
        search: trimmed,
        pageSize: 10,
        signal: abortController.signal,
      };

      const { items } = await catalogApi.listProducts(params);

      const results: SearchResult[] = items.map((p) => ({
        id: p.slug ?? p.id,
        name: p.name,
        type: "product",
        category: p.category?.name ?? "",
        price: Number(p.price) || undefined,
        sellingPrice: Number(p.sellingPrice ?? p.price) || undefined,
        originalPrice: p.originalPrice != null ? Number(p.originalPrice) : undefined,
        description: p.shortDescription ?? p.description ?? undefined,
        image: p.images[0],
      }));

      setSearchResults(results);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Search error:", err);
        setSearchResults([]);
      }
    } finally {
      setIsLoading(false);
    }

    return () => abortController.abort();
  }, []);

  /* ---------------- Debounced search with cleanup ---------------- */
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchProducts]);

  /* ---------------- Navigation ---------------- */
  const handleSearchResultClick = (result: SearchResult) => {
    setSearchQuery("");
    setSearchResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
    const path = `/products/${result.id}` as Route;
    router.push(path);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setActiveIndex(-1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      setSearchQuery("");
      setSearchResults([]);
      setIsOpen(false);
      setActiveIndex(-1);
      router.push(`/shop?search=${encodeURIComponent(query)}`);
    }
  };

  /* ---------------- Keyboard navigation ---------------- */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
      setTimeout(() => {
        const activeElement = document.querySelector(
          `[data-result-index="${activeIndex + 1}"]`,
        );
        if (activeElement) {
          activeElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }, 100);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      setTimeout(() => {
        const activeElement = document.querySelector(
          `[data-result-index="${activeIndex - 1}"]`,
        );
        if (activeElement) {
          activeElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }, 100);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSearchResultClick(searchResults[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  /* ---------------- Formatting ---------------- */
  const formatPrice = (price: number) => `KSh ${price.toLocaleString("en-KE")}`;

  /* ---------------- Highlight matching text ---------------- */
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="bg-yellow-200 dark:bg-yellow-800/50 font-semibold">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  const showResults = isOpen && (searchQuery.trim() !== "" || isLoading);

  /* ---------------- UI ---------------- */
  return (
    <div ref={searchBoxRef} className="relative w-full">
      {/* Search Bar */}
      <form
        onSubmit={handleSubmit}
        role="search"
        className="flex h-[50px] w-full items-center rounded-full border border-[#E5E7EB] bg-white shadow-sm transition-all focus-within:border-[#009933] focus-within:ring-2 focus-within:ring-[#009933]/20 dark:border-slate-700 dark:bg-gray-800"
      >
        <span className="flex flex-shrink-0 items-center pl-4 text-gray-400 dark:text-gray-500">
          <Search size={20} />
        </span>

        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder="Search foods, herbs, spices, oils, seeds..."
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-700 outline-none placeholder-gray-400 dark:text-gray-200 dark:placeholder-gray-500"
          aria-label="Search input"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="mr-1 flex-shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}

        <button
          type="submit"
          className="m-1.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#009933] text-white transition-colors hover:bg-[#006B2C] disabled:opacity-60"
          aria-label="Search"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <Search size={20} />
          )}
        </button>
      </form>

      {/* Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
          >
            {/* Results */}
            {searchResults.length > 0 && (
              <div
                className="max-h-[400px] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                style={{
                  scrollBehavior: "smooth",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {/* Results count */}
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                  {searchResults.length} result{searchResults.length > 1 ? "s" : ""}
                </div>

                {searchResults.map((result, index) => (
                  <button
                    key={result.id}
                    data-result-index={index}
                    onClick={() => handleSearchResultClick(result)}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(-1)}
                    className={`flex w-full gap-3 border-b border-gray-100 px-4 py-3 text-left transition-all duration-150 last:border-b-0 dark:border-gray-700/50 ${
                      activeIndex === index
                        ? "scale-[1.01] bg-sky-50 shadow-sm dark:bg-gray-700/70"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/40"
                    }`}
                  >
                    {/* Image */}
                    <div className="flex-shrink-0">
                      {result.image ? (
                        <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800">
                          <Image
                            src={result.image}
                            alt={result.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-1 font-semibold text-gray-800 dark:text-gray-100">
                        {highlightMatch(result.name, searchQuery)}
                      </div>

                      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {result.category && (
                          <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-700">
                            {result.category}
                          </span>
                        )}
                        <span className="ml-2 capitalize text-gray-400 dark:text-gray-500">
                          {result.type}
                        </span>
                      </div>

                      {result.description && (
                        <div className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                          {result.description}
                        </div>
                      )}

                      {(result.sellingPrice ?? result.price) != null && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">
                            {formatPrice(result.sellingPrice ?? result.price ?? 0)}
                          </span>
                          {result.originalPrice &&
                            result.originalPrice > (result.sellingPrice ?? result.price ?? 0) && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatPrice(result.originalPrice)}
                              </span>
                            )}
                        </div>
                      )}
                    </div>

                    {/* Arrow indicator on hover */}
                    <div
                      className={`flex flex-shrink-0 items-center transition-opacity duration-200 ${
                        activeIndex === index ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <svg className="h-4 w-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && searchQuery && searchResults.length === 0 && (
              <div className="px-4 py-8 text-center">
                <div className="mb-2 text-gray-400 dark:text-gray-500">
                  <Search size={32} className="mx-auto opacity-50" />
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  No results found for &quot;
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{searchQuery}</span>&quot;
                </div>
                <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Try different keywords or check your spelling
                </div>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && searchQuery && searchResults.length === 0 && (
              <div className="space-y-3 px-4 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex animate-pulse gap-3">
                    <div className="h-16 w-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

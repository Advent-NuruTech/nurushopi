"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { catalogApi } from "@/lib/api";
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

export default function SearchBar({ showSearch, setShowSearch }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isScrolling, setIsScrolling] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();

  /* ---------------- Close search on outside click ---------------- */
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
        // Don't close if clicking on results container
        if (resultsContainerRef.current?.contains(target)) {
          return;
        }
        setShowSearch(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showSearch, setShowSearch]);

  /* ---------------- Handle scroll within results ---------------- */
  useEffect(() => {
    const handleResultsScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      // Only prevent closing if scrolling within results container
      if (resultsContainerRef.current?.contains(target)) {
        setIsScrolling(true);
        
        // Clear previous timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // Reset scrolling state after a short delay
        scrollTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, 150);
      }
    };

    const resultsContainer = resultsContainerRef.current;
    if (resultsContainer) {
      resultsContainer.addEventListener("scroll", handleResultsScroll, { passive: true });
    }

    return () => {
      if (resultsContainer) {
        resultsContainer.removeEventListener("scroll", handleResultsScroll);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [showSearch]);

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
    setShowSearch(false);
    setActiveIndex(-1);
    const path = `/products/${result.id}` as Route;
    router.push(path);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setActiveIndex(-1);
  };

  /* ---------------- Keyboard navigation ---------------- */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
      // Scroll active item into view
      setTimeout(() => {
        const activeElement = document.querySelector(`[data-result-index="${activeIndex + 1}"]`);
        if (activeElement) {
          activeElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }, 100);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      setTimeout(() => {
        const activeElement = document.querySelector(`[data-result-index="${activeIndex - 1}"]`);
        if (activeElement) {
          activeElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }, 100);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSearchResultClick(searchResults[activeIndex]);
    } else if (e.key === "Escape") {
      setShowSearch(false);
    }
  };

  /* ---------------- Formatting ---------------- */
  const formatPrice = (price: number) =>
    `KSh ${price.toLocaleString("en-KE")}`;

  /* ---------------- Highlight matching text ---------------- */
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <span key={i} className="bg-yellow-200 dark:bg-yellow-800/50 font-semibold">{part}</span> : 
        part
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      {/* Search Button */}
      <button
        ref={searchButtonRef}
        onClick={() => setShowSearch(!showSearch)}
        aria-label="Search"
        aria-expanded={showSearch}
        className="p-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition relative"
      >
        <Search size={22} />
        {showSearch && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Search Dropdown */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            ref={searchBoxRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute top-full left-1/2 -translate-x-1/2 w-[90%] md:w-[60%] max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 mt-2 z-50 overflow-hidden"
          >
            {/* Input */}
            <div className="flex items-center px-4 py-3 bg-gray-50 dark:bg-gray-900/50">
              <Search size={18} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search products, books, or remedies..."
                className="flex-1 bg-transparent outline-none px-3 py-2 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 min-w-0"
                aria-label="Search input"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                  aria-label="Clear search"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              )}
              {isLoading && (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0 ml-2" />
              )}
            </div>

            {/* Results */}
            {searchResults.length > 0 && (
              <div 
                ref={resultsContainerRef}
                className="max-h-[400px] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                style={{ 
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {/* Results count */}
                <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
                  {searchResults.length} result{searchResults.length > 1 ? 's' : ''}
                </div>

                {searchResults.map((result, index) => (
                  <button
                    key={result.id}
                    data-result-index={index}
                    onClick={() => handleSearchResultClick(result)}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(-1)}
                    className={`w-full px-4 py-3 flex gap-3 text-left transition-all duration-150 border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 ${
                      activeIndex === index
                        ? "bg-blue-50 dark:bg-gray-700/70 scale-[1.01] shadow-sm"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/40"
                    }`}
                  >
                    {/* Image */}
                    <div className="flex-shrink-0">
                      {result.image ? (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                          <Image
                            src={result.image}
                            alt={result.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-xs text-gray-400 dark:text-gray-500 rounded-lg">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 dark:text-gray-100 line-clamp-1">
                        {highlightMatch(result.name, searchQuery)}
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {result.category && (
                          <span className="inline-block bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                            {result.category}
                          </span>
                        )}
                        <span className="ml-2 capitalize text-gray-400 dark:text-gray-500">
                          {result.type}
                        </span>
                      </div>

                      {result.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
                          {result.description}
                        </div>
                      )}

                      {(result.sellingPrice ?? result.price) != null && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">
                            {formatPrice(result.sellingPrice ?? result.price ?? 0)}
                          </span>
                          {result.originalPrice && result.originalPrice > (result.sellingPrice ?? result.price ?? 0) && (
                            <span className="text-xs text-gray-400 line-through">
                              {formatPrice(result.originalPrice)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Arrow indicator on hover */}
                    <div className={`flex-shrink-0 flex items-center transition-opacity duration-200 ${
                      activeIndex === index ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="text-gray-400 dark:text-gray-500 mb-2">
                  <Search size={32} className="mx-auto opacity-50" />
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  No results found for &quot;<span className="font-semibold text-gray-700 dark:text-gray-300">{searchQuery}</span>&quot;
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Try different keywords or check your spelling
                </div>
              </div>
            )}

            {/* Initial state - show suggestions */}
            {!isLoading && !searchQuery && (
              <div className="px-4 py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                <span>Type to start searching</span>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && searchQuery && searchResults.length === 0 && (
              <div className="px-4 py-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
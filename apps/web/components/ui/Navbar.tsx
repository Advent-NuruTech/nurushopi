"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Grid3X3,
  Menu,
  Package,
  Search,
  ShoppingCart,
  Store,
  X,
} from "lucide-react";

import SearchBar from "./SearchBar";
import Sidebar from "./Sidebar";
import UserMenu from "./UserMenu";
import UserNotificationsBell from "./UserNotificationsBell";

import { useCart } from "@/context/CartContext";
import { catalogApi } from "@/lib/api";

interface Category {
  name: string;
  href: string;
  query?: Record<string, string>;
  icon?: string;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const { cart } = useCart();
  const cartCount = isClient ? cart.reduce((count, item) => count + item.quantity, 0) : 0;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const savedTheme = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && systemDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isClient]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;
    catalogApi
      .listCategories()
      .then(({ categories: cats }) => {
        if (cancelled) return;
        setCategories(
          cats.map((c) => ({
            name: c.name,
            href: "/shop",
            query: { category: c.slug },
            icon: c.icon ?? undefined,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-gray-950/95"
          : "border-b border-transparent bg-white/95 backdrop-blur-sm dark:bg-gray-950/90"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 py-3">
        {/* Single row: Logo | Nav | Search | Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
            onClick={() => setIsOpen(!isOpen)}
            data-menu-button
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 hover:opacity-85"
            aria-label="NuruShop Home"
          >
            <Image
              src="/assets/logo.png"
              alt="NuruShop Logo"
              width={40}
              height={40}
              className="rounded-full object-cover"
              priority
            />
            <span className="hidden text-xl font-bold text-slate-900 dark:text-white md:block">
              NuruShop
            </span>
          </Link>

          <div className="hidden items-center gap-4 text-sm font-semibold text-slate-700 dark:text-slate-300 xl:flex">
            <Link href="/" className="hover:text-sky-600 dark:hover:text-emerald-400">
              
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 hover:text-sky-600 dark:hover:text-emerald-400"
            >
              <Store size={16} />
              Shop
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setShowDropdown(true)}
              onMouseLeave={() => setShowDropdown(false)}
            >
              <button className="flex items-center gap-1 hover:text-sky-600 dark:hover:text-emerald-400">
                <Grid3X3 size={16} />
                Categories <ChevronDown size={16} />
              </button>

              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full z-50 mt-2 max-h-96 w-72 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-gray-900"
                  >
                    {categories.length > 0 ? (
                      categories.slice(0, 12).map((cat) => (
                        <Link
                          key={cat.name}
                          href={{ pathname: cat.href, query: cat.query }}
                          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-sky-50 dark:hover:bg-gray-800"
                        >
                          <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {cat.icon || <Package size={16} />}
                          </span>
                          <span>{cat.name}</span>
                        </Link>
                      ))
                    ) : (
                      <Link
                        href="/shop"
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-sky-50 dark:hover:bg-gray-800"
                      >
                        <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <Search size={16} />
                        </span>
                        Browse all departments
                      </Link>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="hidden flex-1 justify-end px-3 lg:flex">
            <div className="w-full max-w-xl">
              <SearchBar />
            </div>
          </div>

          <Link
            href="/wholeseller"
            className="hidden shrink-0 items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-orange-400 hover:text-orange-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-500 dark:hover:text-orange-400 lg:flex"
          >
            <Package size={16} />
            Wholesale
            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Bulk
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 lg:ml-0">
            <button
              className="rounded-full border border-slate-200 p-2 transition-colors hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:hover:border-emerald-500 dark:hover:text-emerald-400 lg:hidden"
              onClick={() => setShowMobileSearch((v) => !v)}
              aria-label="Toggle search"
            >
              {showMobileSearch ? <X size={20} /> : <Search size={20} />}
            </button>

            <UserMenu />
            <UserNotificationsBell />

            <Link
              href="/checkout"
              className="relative rounded-full border border-slate-200 p-2 hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
              aria-label="Open checkout"
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-2 text-xs text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile search (overlay, keeps navbar a single row) */}
        <AnimatePresence>
          {showMobileSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden lg:hidden"
            >
              <div className="pb-2 pt-3">
                <SearchBar />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} categories={categories} />
    </nav>
  );
}

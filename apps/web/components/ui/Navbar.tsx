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
  User,
  X,
} from "lucide-react";

import SearchBar from "./SearchBar";
import Sidebar from "./Sidebar";
import UserNotificationsBell from "./UserNotificationsBell";

import { useCart } from "@/context/CartContext";
import { useAppUser } from "@/context/UserContext";
import { catalogApi } from "@/lib/api";

interface Category {
  name: string;
  href: string;
  query?: Record<string, string>;
  icon?: string;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const { cart } = useCart();
  const { user, isLoading, logout } = useAppUser();
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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 hover:opacity-85"
          aria-label="NuruShop Home"
        >
          <Image
            src="/assets/logo.jpg"
            alt="NuruShop Logo"
            width={40}
            height={40}
            className="rounded-full object-cover"
            priority
          />
          <span className="text-xl font-bold text-slate-900 dark:text-white">NuruShop</span>
        </Link>

        <div className="hidden flex-1 justify-center px-3 lg:flex">
          <div className="w-full max-w-xl">
            <SearchBar showSearch={showSearch} setShowSearch={setShowSearch} />
          </div>
        </div>

        <div className="hidden items-center gap-5 text-sm font-semibold text-slate-700 dark:text-slate-300 md:flex">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <Link href="/shop" className="inline-flex items-center gap-1.5 hover:text-blue-600">
            <Store size={16} />
            Shop
          </Link>
          <Link href="/wholeseller" className="flex items-center gap-2 hover:text-blue-600">
            <Package size={16} />
            Wholesale
            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Bulk
            </span>
          </Link>

          <div
            className="relative"
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <button className="flex items-center gap-1 hover:text-blue-600">
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
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-gray-800"
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
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-gray-800"
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

          <Link href="/about" className="hover:text-blue-600">
            About
          </Link>
          <Link href="/contact" className="hover:text-blue-600">
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="lg:hidden">
            <SearchBar showSearch={showSearch} setShowSearch={setShowSearch} />
          </div>
          <UserNotificationsBell />

          <Link
            href="/checkout"
            className="relative rounded-full border border-slate-200 p-2 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700"
            aria-label="Open checkout"
          >
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-orange-500 px-2 text-xs text-white">
                {cartCount}
              </span>
            )}
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            {!isLoading && user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-full p-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="User Profile"
                  aria-label="Open profile"
                >
                  <Image
                    src={user.imageUrl || "/assets/logo.jpg"}
                    alt="User Avatar"
                    width={32}
                    height={32}
                    className="rounded-full object-cover ring-2 ring-sky-500/30 dark:ring-sky-400/30"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {user.name || "User"}
                  </span>
                  <User size={16} className="text-slate-500 dark:text-slate-400" />
                </Link>
                <button
                  onClick={logout}
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-950"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Sign in
              </Link>
            )}
          </div>

          <button
            className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} categories={categories} />
    </nav>
  );
}

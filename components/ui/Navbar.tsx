"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShoppingCart, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  UserButton,
  SignInButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import SearchBar from "./SearchBar";
import Sidebar from "./Sidebar";
import type { Route } from "next";

interface Category {
  name: string;
  href: Route;
  icon: string;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const { cart } = useCart();
  const cartCount = isClient
    ? cart.reduce((count, item) => count + item.quantity, 0)
    : 0;

  useEffect(() => {
    setIsClient(true);
  }, []);

  /* ---------------- Dark mode init ---------------- */
  useEffect(() => {
    if (!isClient) return;

    const savedTheme = localStorage.getItem("theme");
    const systemDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (savedTheme === "dark" || (!savedTheme && systemDark)) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, [isClient]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  /* ---------------- Scroll detection ---------------- */
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ---------------- Categories (typed) ---------------- */
  const categories: Category[] = [
    { name: "All Remedies", href: "/herbs" as Route, icon: "🌿" },
    { name: "Food Staffs", href: "/foods" as Route, icon: "🥗" },
    { name: "EGW", href: "/egw" as Route, icon: "📚" },
    { name: "Pioneers Literature", href: "/pioneers" as Route, icon: "📜" },
    { name: "Bible Covers", href: "/covers" as Route, icon: "📕" },
    { name: "Song Books", href: "/songbooks" as Route, icon: "🎵" },
    { name: "Other Reliable Authors", href: "/authors" as Route, icon: "✍️" },
    { name: "Oils", href: "/oils" as Route, icon: "🧴" },
    { name: "Bibles", href: "/bibles" as Route, icon: "📖" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-700"
          : "bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
        {/* Logo */}
        <Link
          href={"/" as Route}
          className="flex items-center gap-2 hover:opacity-80 transition"
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
          <span className="text-xl font-semibold text-gray-800 dark:text-white">
            NuruShop
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6 font-medium text-gray-700 dark:text-gray-300">
          <Link href={"/" as Route} className="hover:text-blue-600">
            Home
          </Link>

          {/* Categories */}
          <div
            className="relative"
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <button className="flex items-center gap-1 hover:text-blue-600">
              Categories <ChevronDown size={16} />
            </button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
                >
                  {categories.map((cat) => (
                    <Link
                      key={cat.name}
                      href={cat.href}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700"
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link href={"/about" as Route} className="hover:text-blue-600">
            About
          </Link>

          <Link href={"/contact" as Route} className="hover:text-blue-600">
            Contact
          </Link>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-4">
          <SearchBar showSearch={showSearch} setShowSearch={setShowSearch} />

          {/* Cart */}
          <Link
            href={"/checkout" as Route}
            className="relative p-2 hover:text-blue-600"
          >
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[20px] h-5 rounded-full flex items-center justify-center">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {/* Auth (hidden on mobile) */}
          <div className="hidden md:flex items-center">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <SignedOut>
              <SignInButton>
                <button className="px-3 py-1.5 bg-sky-600 text-white rounded-md text-sm hover:bg-sky-700">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
          </div>

          {/* Mobile menu */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sidebar
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        categories={categories}

      />
    </nav>
  );
}

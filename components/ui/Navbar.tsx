"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ShoppingCart, User, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import SearchBar from "./SearchBar";
import Sidebar from "./Sidebar";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const { cart } = useCart();
  const cartCount = isClient ? cart.reduce((count, item) => count + item.quantity, 0) : 0;

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize dark mode
  useEffect(() => {
    if (!isClient) return;
    
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, [isClient]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Scroll detection
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Navigation categories
  const categories = [
    { name: "All Remedies", href: "/herbs", icon: "🌿" },
    { name: "Food Staffs", href: "/foods", icon: "🥗" },
    { name: "EGW", href: "/egw", icon: "📚" },
    { name: "Pioneers Literature", href: "/pioneers", icon: "📜" },
    { name: "Bible Covers", href: "/covers", icon: "📕" },
    { name: "Song Books", href: "/songbooks", icon: "🎵" },
    { name: "Other Reliable Authors", href: "/authors", icon: "✍️" },
    { name: "Oils", href: "/oils", icon: "🧴" },
 
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
        <div className="flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
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
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 text-gray-700 dark:text-gray-300 font-medium">
          <Link 
            href="/" 
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
          >
            Home
          </Link>
         
          {/* Categories Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <button 
              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
              aria-expanded={showDropdown}
            >
              Categories <ChevronDown size={16} />
            </button>
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-64 py-2 z-50 max-h-96 overflow-y-auto"
                >
                  {categories.map((category, index) => (
                    <Link 
                      key={index}
                      href={category.href as unknown as any} 
                      className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      <span className="text-lg">{category.icon}</span>
                      <span className="font-medium">{category.name}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link 
            href="/about"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
          >
            About
          </Link>
           <Link 
            href="/contact"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
          >
            contact
          </Link>
          
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-4">
          {/* Search Button */}
          <SearchBar 
            showSearch={showSearch}
            setShowSearch={setShowSearch}
          />

          {/* Cart */}
          <Link 
            href="/checkout"
            className="relative p-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            aria-label={`Shopping cart with ${cartCount} items`}
          >
            <ShoppingCart size={22} className="text-gray-700 dark:text-gray-300" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full px-1">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {/* Auth Buttons */}
          <div className="flex items-center">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <SignInButton>
                <button className="px-3 py-1.5 bg-sky-600 text-white rounded-md text-sm hover:bg-sky-700 transition">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <X size={22} className="text-gray-700 dark:text-gray-300" />
            ) : (
              <Menu size={22} className="text-gray-700 dark:text-gray-300" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sidebar 
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        categories={categories}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
    </nav>
  );
}
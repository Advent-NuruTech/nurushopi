"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { LogIn, ChevronDown, ChevronRight, Package } from "lucide-react";
import { useAppUser } from "@/context/UserContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

interface Category {
  name: string;
  href: string; // "/shop"
  query?: Record<string, string>; // e.g. { category: "beverages" }
  icon?: string;
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  categories: Category[];
}

export default function Sidebar({ isOpen, setIsOpen, categories }: SidebarProps) {
  const [showCategories, setShowCategories] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const { user, isLoading } = useAppUser();

  const handleLogout = async () => {
    await signOut(auth);
    setIsOpen(false);
  };

  const handleLinkClick = () => {
    setIsOpen(false);
    setShowCategories(false);
  };

  // Close sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(target) && !target.closest('[data-menu-button]')) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar */}
          <motion.aside
            ref={sidebarRef}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 h-screen w-80 max-w-[85%] bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col md:hidden"
            role="dialog"
            aria-label="Main navigation menu"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <Image
                  src="/assets/logo.jpg"
                  alt="NuruShop Logo"
                  width={36}
                  height={36}
                  className="rounded-full object-cover"
                />
                <span className="text-lg font-semibold text-gray-800 dark:text-white">
                  NuruShop
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-6 flex flex-col gap-1">
              <Link
                href="/"
                onClick={handleLinkClick}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                <span className="text-lg">🏠</span> Home
              </Link>

              <Link
                href="/shop"
                onClick={handleLinkClick}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                <span className="text-lg">🛍️</span> Shop
              </Link>

              <Link
                href="/myoders"
                onClick={handleLinkClick}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                <Package size={18} className="text-gray-500" />
                My Orders
              </Link>

              {/* Categories */}
              <div className="mt-4 mb-2">
                <button
                  onClick={() => setShowCategories(!showCategories)}
                  className="flex items-center justify-between w-full px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                >
                  <span>Categories</span>
                  {showCategories ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
                </button>

                <AnimatePresence>
                  {showCategories && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="ml-6 mt-2 overflow-hidden"
                    >
                      <div className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-1">
                        {categories.map((category) => {
                          const categoryHref = category.query
                            ? { pathname: category.href, query: category.query }
                            : { pathname: category.href };
                          return (
                            <Link
                              key={category.name}
                              href={categoryHref}
                              onClick={handleLinkClick}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium transition-colors text-sm"
                            >
                              {category.icon && <span>{category.icon}</span>}
                              {category.name}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link
                href="/contact"
                onClick={handleLinkClick}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                <span className="text-lg">📞</span> Contact
              </Link>

              <Link
                href="/checkout"
                onClick={handleLinkClick}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                <span className="text-lg">🛒</span> Cart
              </Link>
            </nav>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800 space-y-3">
              {!isLoading && user ? (
                <div className="space-y-3">
                  <Link
                    href="/profile"
                    onClick={handleLinkClick}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Image
                      src={user.imageUrl || "/assets/logo.jpg"}
                      alt="User Avatar"
                      width={32}
                      height={32}
                      className="rounded-full object-cover ring-2 ring-sky-500/30"
                    />
                    <div className="flex-1 text-left">
                      <p className="text-gray-700 dark:text-gray-300 font-medium">{user.name || "User"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </Link>
                  <div className="flex gap-2">
                    <Link
                      href="/profile"
                      onClick={handleLinkClick}
                      className="flex-1 px-3 py-2 text-center text-sm font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 rounded-md hover:bg-sky-100 dark:hover:bg-sky-900/50"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={handleLinkClick}
                  className="flex items-center justify-center gap-3 px-3 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors w-full"
                >
                  <LogIn size={20} />
                  Sign In / Register
                </Link>
              )}

              <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">NuruShop &copy; {new Date().getFullYear()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Health & Truth</p>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

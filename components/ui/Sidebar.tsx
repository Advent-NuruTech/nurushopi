"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { LogIn, ChevronDown, ChevronRight } from "lucide-react";
import { UserButton, SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  categories: Array<{ name: string; href: any; icon: string }>;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Sidebar({ 
  isOpen, 
  setIsOpen, 
  categories, 
  darkMode, 
  toggleDarkMode 
}: SidebarProps) {
  const [showCategories, setShowCategories] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Close sidebar if clicked outside and not on the menu button
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(target) &&
        !target.closest('[data-menu-button]') // Check if click came from menu button
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setIsOpen]);

  // Close sidebar when route changes
  useEffect(() => {
    const handleRouteChange = () => setIsOpen(false);
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, [setIsOpen]);

  // Close sidebar when Escape key is pressed
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, setIsOpen]);

  const handleLinkClick = () => {
    setIsOpen(false);
    setShowCategories(false);
  };

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
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30 
            }}
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
              {/* Main Links */}
              <Link 
                href="/" 
                onClick={handleLinkClick}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                <span className="text-lg">🏠</span>
                Home
              </Link>

              <Link 
                href="/shop" 
                onClick={handleLinkClick}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                 <span className="text-lg">🍔</span>
                shop
              </Link>

              {/* Categories Section with Dropdown */}
              <div className="mt-4 mb-2">
                <button
                  onClick={() => setShowCategories(!showCategories)}
                  className="flex items-center justify-between w-full px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">📦</span>
                    <span>Categories</span>
                  </div>
                  {showCategories ? (
                    <ChevronDown size={16} className="text-gray-500" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-500" />
                  )}
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
                        {categories.map((category, index) => (
                          <Link 
                            key={index}
                            href={category.href} 
                            onClick={handleLinkClick}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium transition-colors text-sm"
                          >
                            <span className="text-base">{category.icon}</span>
                            {category.name}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Additional Links */}
              <Link 
                href="/contact" 
                onClick={handleLinkClick}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                <span className="text-lg">📞</span>
                Contact
              </Link>

              <Link 
                href="/checkout" 
                onClick={handleLinkClick}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                <span className="text-lg">🛒</span>
                Cart
              </Link>

            </nav>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800 space-y-3">
              <SignedIn>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    Account
                  </span>
                  <UserButton afterSignOutUrl="/" />
                </div>
              </SignedIn>
              
              <SignedOut>
                <SignInButton>
                  <button 
                    onClick={handleLinkClick}
                    className="flex items-center justify-center gap-3 px-3 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors w-full"
                  >
                    <LogIn size={20} />
                    Sign In / Register
                  </button>
                </SignInButton>
              </SignedOut>

              {/* Additional Footer Info */}
              <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  NuruShop &copy; {new Date().getFullYear()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Health & Truth
                </p>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
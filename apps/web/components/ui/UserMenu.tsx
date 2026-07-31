"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { User, LogIn, LogOut, UserCircle2, Info, Phone, Package } from "lucide-react";
import { useAppUser } from "@/context/UserContext";

const getInitials = (name: string): string => {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, isLoading, logout } = useAppUser();

  const close = () => setIsOpen(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && menuRef.current && !menuRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    close();
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Person icon / avatar button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="relative rounded-full border border-slate-200 p-1.5 transition-colors hover:border-sky-300 hover:text-sky-600 dark:border-slate-700 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
        aria-label="Account menu"
        aria-expanded={isOpen}
      >
        {!isLoading && user?.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt={`${user.name || "User"}'s avatar`}
            width={26}
            height={26}
            className="rounded-full object-cover"
          />
        ) : (
          <User size={22} />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-gray-900"
          >
            {!isLoading && user ? (
              <>
                <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    {user.imageUrl ? (
                      <Image
                        src={user.imageUrl}
                        alt={`${user.name || "User"}'s avatar`}
                        width={36}
                        height={36}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 text-sm font-bold text-white">
                        {getInitials(user.name || "User")}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {user.name || "User"}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <UserCircle2 size={18} className="text-slate-400" />
                  View Your Account
                </Link>
              </>
            ) : (
              <Link
                href="/auth/login"
                onClick={close}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LogIn size={18} className="text-slate-400" />
                Sign In
              </Link>
            )}

            <div className="border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/wholeseller"
                onClick={close}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Package size={18} className="text-slate-400" />
                Wholesale &amp; Bulk
              </Link>
              <Link
                href="/about"
                onClick={close}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Info size={18} className="text-slate-400" />
                About NuruShop
              </Link>
              <Link
                href="/contact"
                onClick={close}
                className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Phone size={18} className="text-slate-400" />
                Contact Us
              </Link>
            </div>

            {!isLoading && user && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-slate-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut size={18} />
                Logout
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

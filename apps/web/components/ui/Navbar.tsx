"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Grid3X3,
  Heart,
  Home,
  Menu,
  Package,
  ShoppingCart,
  Store,
  UserRound,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Route } from "next";

import SearchBar from "./SearchBar";
import Sidebar, { type SidebarCategory } from "./Sidebar";
import UserMenu from "./UserMenu";
import UserNotificationsBell from "./UserNotificationsBell";

import { useCart } from "@/context/CartContext";

type DrawerView = "menu" | "categories";

export default function Navbar({
  categories = [],
}: {
  categories?: SidebarCategory[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [drawerView, setDrawerView] = useState<DrawerView>("menu");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { cart } = useCart();
  const cartCount = isClient ? cart.reduce((count, item) => count + item.quantity, 0) : 0;

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!isClient) return;
    const savedTheme = localStorage.getItem("theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle(
      "dark",
      savedTheme === "dark" || (!savedTheme && systemDark),
    );
  }, [isClient]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openDrawer = (view: DrawerView) => {
    setDrawerView(view);
    setIsOpen(true);
  };

  const categoryIsActive = pathname === "/shop" && Boolean(searchParams.get("category"));
  const bottomItems = [
    { label: "Home", href: "/", icon: Home, active: pathname === "/" },
    {
      label: "Categories",
      icon: Grid3X3,
      active: isOpen && drawerView === "categories" ? true : categoryIsActive,
      onClick: () => openDrawer("categories"),
    },
    {
      label: "Wishlist",
      href: "/profile?tab=wishlist",
      icon: Heart,
      active: pathname === "/profile" && searchParams.get("tab") === "wishlist",
    },
    {
      label: "Profile",
      href: "/profile",
      icon: UserRound,
      active: pathname === "/profile" && searchParams.get("tab") !== "wishlist",
    },
  ];

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-gray-950/95"
            : "border-b border-transparent bg-white/95 backdrop-blur-sm dark:bg-gray-950/90"
        }`}
      >
        <div className="mx-auto w-full min-w-0 max-w-7xl px-2 py-2.5 min-[380px]:px-3 sm:px-4 lg:py-3">
          <div className="flex min-w-0 items-center gap-1.5 min-[380px]:gap-2 sm:gap-3">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-85"
              aria-label="NuruShop Home"
            >
              <Image
                src="/assets/logo.png"
                alt="NuruShop Logo"
                width={40}
                height={40}
                className="h-8 w-8 rounded-full object-cover min-[380px]:h-9 min-[380px]:w-9 sm:h-10 sm:w-10"
                priority
              />
              <span className="hidden text-xl font-bold text-slate-900 dark:text-white md:block">
                NuruShop
              </span>
            </Link>

            <div className="hidden items-center gap-4 text-sm font-semibold text-slate-700 dark:text-slate-300 xl:flex">
              <Link
                href="/shop"
                className="inline-flex items-center gap-1.5 hover:text-sky-600 dark:hover:text-emerald-400"
              >
                <Store size={16} /> Shop
              </Link>

              <div
                className="relative"
                onMouseEnter={() => setShowDropdown(true)}
                onMouseLeave={() => setShowDropdown(false)}
              >
                <button
                  type="button"
                  className="flex items-center gap-1 hover:text-sky-600 dark:hover:text-emerald-400"
                >
                  <Grid3X3 size={16} /> Categories <ChevronDown size={16} />
                </button>

                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full z-50 mt-2 max-h-96 w-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-gray-900"
                    >
                      {categories.length > 0 ? (
                        categories.slice(0, 12).map((category) => (
                          <Link
                            key={category.id}
                            href={`/shop?category=${encodeURIComponent(category.slug)}`}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-sky-50 dark:hover:bg-gray-800"
                          >
                            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                              <Image
                                src={category.image}
                                alt=""
                                fill
                                className="object-contain p-1"
                                sizes="36px"
                              />
                            </span>
                            <span className="min-w-0 flex-1 truncate">{category.name}</span>
                            {typeof category.productCount === "number" && (
                              <span className="text-xs text-slate-400">{category.productCount}</span>
                            )}
                          </Link>
                        ))
                      ) : (
                        <Link
                          href="/shop"
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-sky-50 dark:hover:bg-gray-800"
                        >
                          <Package size={18} /> Browse all departments
                        </Link>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="min-w-0 flex-1 lg:px-3">
              <div className="lg:hidden">
                <SearchBar compact placeholder="Search products" />
              </div>
              <div className="hidden lg:block">
                <SearchBar placeholder="Search products" />
              </div>
            </div>

            <Link
              href="/wholeseller"
              className="hidden shrink-0 items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-orange-400 hover:text-orange-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-orange-500 dark:hover:text-orange-400 lg:flex"
            >
              <Package size={16} /> Wholesale
              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Bulk
              </span>
            </Link>

            <div className="hidden items-center gap-2 lg:flex">
              <UserMenu />
              <UserNotificationsBell />
            </div>

            <Link
              href="/checkout"
              className="relative shrink-0 rounded-full border border-slate-200 p-1.5 transition-colors hover:border-sky-300 hover:text-sky-600 min-[380px]:p-2 dark:border-slate-700 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
              aria-label="Open cart"
            >
              <ShoppingCart size={21} />
              {cartCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              className="shrink-0 rounded-full p-1.5 text-slate-700 transition-colors hover:bg-slate-100 min-[380px]:p-2 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
              onClick={() => openDrawer("menu")}
              data-menu-button
              aria-label="Open menu"
              aria-expanded={isOpen && drawerView === "menu"}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>

      </nav>

      <Sidebar
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        categories={categories}
        initialView={drawerView}
        setView={setDrawerView}
      />

      <nav
        aria-label="Mobile primary navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 lg:hidden"
      >
        <div className="mx-auto grid w-full min-w-0 max-w-md grid-cols-4">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <span
                  className={`grid h-7 min-w-11 place-items-center rounded-full transition-colors ${
                    item.active
                      ? "bg-emerald-100 text-[#007f2a] dark:bg-emerald-950 dark:text-emerald-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <Icon size={21} strokeWidth={item.active ? 2.5 : 2} />
                </span>
                <span
                  className={`mt-0.5 text-[11px] font-medium ${
                    item.active
                      ? "text-[#007f2a] dark:text-emerald-400"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {item.label}
                </span>
              </>
            );

            return item.href ? (
              <Link
                key={item.label}
                href={item.href as Route}
                className="flex min-h-12 min-w-0 flex-col items-center justify-center rounded-xl"
                aria-current={item.active ? "page" : undefined}
              >
                {content}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex min-h-12 min-w-0 flex-col items-center justify-center rounded-xl"
                aria-expanded={isOpen && drawerView === "categories"}
              >
                {content}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

import React, { ReactNode, Suspense } from "react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import { listCategories } from "@/lib/data/catalog";

export const metadata = {
  title: "NuruShop – Health & Truth Marketplace",
  description:
    "Shop trusted natural health products, organic foods, herbal remedies, and faith-inspired spiritual literature at NuruShop.",
};

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const categories = await listCategories(true);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <Suspense
        fallback={
          <div className="fixed inset-x-0 top-0 z-50 h-[3.75rem] border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950" />
        }
      >
        <Navbar
          categories={categories.map((category) => ({
            ...category,
            href: "/shop",
          }))}
        />
      </Suspense>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-2 sm:px-4 lg:px-8 pt-[3.75rem] pb-24 lg:pb-8">
       
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

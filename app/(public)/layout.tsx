import React, { ReactNode } from "react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

export const metadata = {
  title: "NuruShop – Health & Truth Marketplace",
  description:
    "Shop trusted natural health products, organic foods, herbal remedies, and faith-inspired spiritual literature at NuruShop.",
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <Navbar />

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

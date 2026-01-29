
import React from "react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";

import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { UserProvider } from "@/context/UserContext";

export const metadata = {
  title: "NuruShop - Natural Health & Truth Products",
  description:
    "Discover NuruShop’s collection of natural remedies,organic foods, herbal products, and spiritual literature inspired by true health and Bible principles.",
  keywords: [
    "Natural remedies",
    "Health products",
    "Spiritual books",
    "Herbal medicine",
    "Ellen White writings",
    "Reformers",
    "Healthy foods",
    "Trusted Books ",
    "Pionners writings",
    "Bible truth products",
    "NuruShop",
  ],
  authors: [{ name: "NuruShop Team" }],
  icons: {
    icon: "/assets/logo.jpg",
  },
  openGraph: {
    title: "NuruShop – Health & Truth Marketplace",
    description:
      "Shop natural health remedies and Bible-based literature at NuruShop. Discover healing and light through natural living.",
    url: "https://nurushop.co.ke",
    siteName: "NuruShop",
    images: [
      {
        url: "/assets/logo.jpg",
        width: 800,
        height: 600,
        alt: "NuruShop Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NuruShop – Health & Truth Marketplace",
    description:
      "Explore trusted natural remedies and inspired literature at NuruShop.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    disallow: ["/about", "/contact", "/login", "/register", "/dashboard"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        <UserProvider>
          <ThemeProvider>
            <CartProvider>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  {children}
                </main>
                <Footer />
              </div>
            </CartProvider>
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}

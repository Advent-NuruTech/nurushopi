import "./globals.css";
import React, { ReactNode } from "react";

import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { UserProvider } from "@/context/UserContext";

export const metadata = {
  metadataBase: new URL("https://nurushop.co.ke"),

  title: {
    default: "NuruShop | Health & Truth Marketplace",
    template: "%s | NuruShop",
  },

  description:
    "NuruShop is a trusted marketplace for natural organic health products, organic foods, herbal products, and faith-inspired spiritual literature. Discover healing, wellness, and truth through natural living and Bible-based resources.",

  keywords: [
    "NuruShop",
    "natural remedies Kenya",
    "herbal medicine shop",
    "organic food store Kenya",
    "natural health products",
    "herbal supplements",
    "spiritual books",
    "Bible literature",
    "Ellen White books",
    "Christian health books",
    "healthy living products",
    "organic wellness store",
    "Advent Nurutech marketplace",
    "Reformers hub",
    "natural healing products",
    "faith based bookstore",
    "health reform products",
    "Kenya online natural shop",
    "organic lifestyle products",
    "natural oils and herbs",
    "health and wellness marketplace",
    "Christian literature store",
  ],

  authors: [{ name: "NuruShop Team" }],
  creator: "NuruShop",
  publisher: "NuruShop",

  icons: {
    icon: "/assets/logo.jpg",
    apple: "/assets/logo.jpg",
  },

  openGraph: {
    title: "NuruShop – Health & Truth Marketplace",
    description:
      "Shop trusted natural remedies, organic foods, herbal wellness products, and inspiring spiritual literature. Bringing health, healing, and truth to every home.",
    url: "https://nurushop.co.ke",
    siteName: "NuruShop",
    images: [
      {
        url: "/assets/logo.jpg",
        width: 1200,
        height: 630,
        alt: "NuruShop Natural Health Marketplace",
      },
    ],
    locale: "en_KE",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "NuruShop – Health & Truth Marketplace",
    description:
      "Discover natural healing products, organic foods, and inspiring spiritual books at NuruShop.",
    images: ["/assets/logo.jpg"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  category: "health and wellness",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        <UserProvider>
          <ThemeProvider>
            <CartProvider>{children}</CartProvider>
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}

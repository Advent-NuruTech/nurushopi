import "./globals.css";
import React from "react";

import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { UserProvider } from "@/context/UserContext";

export const metadata = {
  metadataBase: new URL("https://nurushop.co.ke"),
  title: "NuruShop - Natural Health & Truth Products",
  description:
    "Discover NuruShop’s collection of natural remedies, organic foods, herbal products, and spiritual literature inspired by true health and Bible principles.",
  keywords: [
    "Natural remedies",
    "Health products",
    "Spiritual books",
    "Herbal medicine",
    "Ellen White writings",
    "Healthy foods",
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
      "Shop natural health remedies and Bible-based literature at NuruShop.",
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
      "Explore trusted natural remedies and literature at NuruShop.",
    images: ["/assets/logo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
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
            <CartProvider>{children}</CartProvider>
          </ThemeProvider>
        </UserProvider>
      </body>
    </html>
  );
}

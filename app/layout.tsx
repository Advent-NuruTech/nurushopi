import "./globals.css";
import React from "react";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import { ClerkProvider } from "@clerk/nextjs";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { UserProvider } from "@/context/UserContext";

export const metadata = {
  title: "NuruShop - Health & Truth",
  description: "Natural remedies and spiritual literature marketplace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
        <ClerkProvider>
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
        </ClerkProvider>
      </body>
    </html>
  );
}

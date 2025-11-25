"use client";

import React from "react";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t">
      <div className="container mx-auto px-4 py-10">
        {/* 2x2 Grid: Always 2 columns, 2 rows */}
        <div className="grid grid-cols-2 gap-6 text-center">

          {/* Column 1 */}
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              NuruShop
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              Pure • Natural • Healthy Living
            </p>
          </div>

          {/* Column 2 */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase">
              Quick Links
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-gray-400">
              <li>
                <a href="/shop" className="hover:text-green-600 transition">
                  Shop
                </a>
              </li>
              <li>
                <a href="/about" className="hover:text-green-600 transition">
                  About Us
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-green-600 transition">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase">
              Contact
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-gray-400">
              <li>
                Phone:{" "}
                <a
                  href="tel:+254759167209"
                  className="hover:text-green-600 underline transition"
                >
                  +254 105 178 685
                </a>
              </li>
              <li>
                WhatsApp:{" "}
                <a
                  href="https://wa.me/254105178685"
                  className="hover:text-green-600 underline transition"
                >
                  Chat Now
                </a>
              </li>
              <li>Kisumu • Kenya</li>
            </ul>
          </div>

          {/* Column 4 */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase">
              Info
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-gray-400">
        
              <li>Secure payments</li>
              <li>Customer support: Sunday-Fri, 9am-6pm</li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t text-center text-xs text-slate-500 dark:text-gray-500">
          © {new Date().getFullYear()} NuruShop — Health & Truth. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
}

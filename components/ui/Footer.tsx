"use client";

import React from "react";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, ShoppingBag, Heart, Shield } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-950 border-t border-slate-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                NuruShop
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed">
              Pure • Natural • Healthy Living
            </p>
            <p className="text-xs text-slate-500 dark:text-gray-500 leading-relaxed">
              Your trusted source for authentic natural products that nurture wellness and vitality.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-3 pt-2">
              <a 
                href="#" 
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900/30 hover:scale-110 transition-all duration-200"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4 text-slate-600 dark:text-gray-400" />
              </a>
              <a 
                href="#" 
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900/30 hover:scale-110 transition-all duration-200"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4 text-slate-600 dark:text-gray-400" />
              </a>
              <a 
                href="#" 
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900/30 hover:scale-110 transition-all duration-200"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4 text-slate-600 dark:text-gray-400" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {[
                { label: "Shop All", href: "/shop" },
                { label: "About Us", href: "/about" },
                { label: "Contact", href: "/contact" },
                { label: "Blog", href: "" },
                { label: "FAQs", href: "" }
              ].map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href} 
                    className="text-sm text-slate-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-500 transition-colors duration-200 flex items-center gap-2 group"
                  >
                    <span className="w-0 h-0.5 bg-green-600 group-hover:w-4 transition-all duration-200"></span>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Get in Touch
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-gray-400">
                <Phone className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <a 
                  href="tel:+254105178685" 
                  className="hover:text-green-600 dark:hover:text-green-500 transition-colors"
                >
                  +254 105 178 685
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-gray-400">
                <Mail className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <a 
                  href="https://wa.me/254105178685" 
                  className="hover:text-green-600 dark:hover:text-green-500 transition-colors"
                >
                  WhatsApp Chat
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-gray-400">
                <MapPin className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>online</span>
              </li>
            </ul>
            
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-gray-800">
              <p className="text-xs text-slate-500 dark:text-gray-500">
                <strong className="text-slate-600 dark:text-gray-400">Support Hours:</strong><br />
                Sunday - Friday<br />
                6:00 PM- 6:00 PM EAT
              </p>
            </div>
          </div>

          {/* Trust Badges */}
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Why Choose Us
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Shield className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-gray-300">Secure Payments</p>
                  <p className="text-xs text-slate-500 dark:text-gray-500">100% protected checkout</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Heart className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-gray-300">Natural Products</p>
                  <p className="text-xs text-slate-500 dark:text-gray-500">Pure & authentic</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ShoppingBag className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-gray-300">Fast Delivery</p>
                  <p className="text-xs text-slate-500 dark:text-gray-500">Quick & reliable</p>
                </div>
              </li>
            </ul>
          </div>

        </div>

        {/* Newsletter Section */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-gray-800">
          <div className="max-w-md mx-auto text-center">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
              Stay Updated
            </h4>
            <p className="text-xs text-slate-600 dark:text-gray-400 mb-4">
              Get exclusive offers and health tips delivered to your inbox
            </p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="your@email.com"
                className="flex-1 px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 hover:shadow-lg">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500 dark:text-gray-500">
            <p>
              © {currentYear} <span className="font-semibold text-slate-600 dark:text-gray-400">NuruShop</span> — Health & Truth. All Rights Reserved.
            </p>
            <div className="flex gap-6">
              <a href="" className="hover:text-green-600 dark:hover:text-green-500 transition-colors">
                Privacy Policy
              </a>
              <a href="" className="hover:text-green-600 dark:hover:text-green-500 transition-colors">
                Terms of Service
              </a>
              <a href="" className="hover:text-green-600 dark:hover:text-green-500 transition-colors">
                Shipping Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
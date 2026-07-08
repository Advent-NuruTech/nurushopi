"use client";

import React from "react";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, ShoppingBag, Heart, Shield, ChevronRight } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 border-t border-slate-200/50 dark:border-gray-800/50 overflow-hidden">
      {/* Subtle Background Decorations */}
      <div className="absolute inset-0 bg-grid-slate-100/50 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] dark:bg-grid-slate-800/20"></div>
      
      <div className="relative container mx-auto px-4 sm:px-6 py-12 md:py-16 lg:py-20">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12 xl:gap-16">
          
          {/* Brand Column */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-emerald-700 to-blue-700 dark:from-white dark:via-emerald-400 dark:to-blue-400 bg-clip-text text-transparent">
                NuruShop
              </h3>
            </div>
            
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 tracking-wide">
              Pure • Natural • Healthy Living
            </p>
            
            <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed max-w-xs">
              Your trusted source for authentic natural products that nurture wellness and vitality.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-2 pt-2">
              {[
                { Icon: Facebook, label: "Facebook", color: "hover:bg-[#1877f2]/10 hover:text-[#1877f2]" },
                { Icon: Instagram, label: "Instagram", color: "hover:bg-[#e4405f]/10 hover:text-[#e4405f]" },
                { Icon: Twitter, label: "Twitter", color: "hover:bg-[#000000]/10 hover:text-[#000000] dark:hover:text-white" }
              ].map(({ Icon, label, color }) => (
                <a 
                  key={label}
                  href="#" 
                  className={`w-10 h-10 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-gray-700/50 flex items-center justify-center text-slate-600 dark:text-gray-400 hover:scale-110 hover:shadow-lg transition-all duration-300 ${color}`}
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-6 relative">
              Quick Links
              <span className="absolute -bottom-2 left-0 w-8 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"></span>
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
                    className="group flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200"
                  >
                    <ChevronRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-emerald-500" />
                    <span className="group-hover:translate-x-1 transition-transform duration-200">
                      {link.label}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="col-span-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-6 relative">
              Get in Touch
              <span className="absolute -bottom-2 left-0 w-8 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"></span>
            </h4>
            <ul className="space-y-4">
              <li className="group flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <a 
                    href="tel:+254105178685" 
                    className="text-slate-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium"
                  >
                    +254 105 178 685
                  </a>
                </div>
              </li>
              <li className="group flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <a 
                    href="https://wa.me/254105178685" 
                    className="text-slate-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-medium"
                  >
                    WhatsApp Chat
                  </a>
                </div>
              </li>
              <li className="group flex items-start gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <span className="text-slate-600 dark:text-gray-400 font-medium">online</span>
                </div>
              </li>
            </ul>
            
            <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-gray-800/60">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-3 border border-slate-200/50 dark:border-gray-700/50">
                <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
                  <span className="font-semibold text-slate-800 dark:text-gray-200">Support Hours:</span><br />
                  Sunday - Friday<br />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">6:00 PM - 6:00 PM EAT</span>
                </p>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-6 relative">
              Why Choose Us
              <span className="absolute -bottom-2 left-0 w-8 h-0.5 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"></span>
            </h4>
            <div className="space-y-4">
              {[
                { Icon: Shield, title: "Secure Payments", desc: "100% protected checkout", gradient: "from-emerald-50 to-green-50 dark:from-gray-800 dark:to-gray-800" },
                { Icon: Heart, title: "Natural Products", desc: "Pure & authentic", gradient: "from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-800" },
                { Icon: ShoppingBag, title: "Fast Delivery", desc: "Quick & reliable", gradient: "from-blue-50 to-cyan-50 dark:from-gray-800 dark:to-gray-800" }
              ].map(({ Icon, title, desc, gradient }) => (
                <div key={title} className={`group flex items-start gap-3 p-3 rounded-xl bg-gradient-to-br ${gradient} border border-slate-200/50 dark:border-gray-700/50 hover:shadow-md transition-all duration-300 hover:scale-[1.02]`}>
                  <div className="w-9 h-9 rounded-lg bg-white/80 dark:bg-gray-900/80 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-200">
                    <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">{title}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-200/60 dark:border-gray-800/60">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-xs">
            <p className="text-slate-500 dark:text-gray-500 text-center md:text-left">
              © {currentYear} <span className="font-semibold text-slate-700 dark:text-gray-300">NuruShop</span> — Health & Truth. All Rights Reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Shipping Policy", href: "" }
              ].map((link) => (
                <a 
                  key={link.label}
                  href={link.href} 
                  className="text-slate-500 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200 hover:underline underline-offset-2"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Powered by Advent NuruTech */}
          <div className="mt-8 text-center">
            <div className="inline-block group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <a
                href="https://adventnurutech.xyz"
                target="_blank"
                className="relative text-sm font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 dark:from-emerald-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent hover:scale-105 transition-all duration-300 inline-block px-6 py-2 rounded-xl hover:shadow-lg hover:shadow-emerald-500/20"
              >
                ✦ Powered by Advent NuruTech ✦
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
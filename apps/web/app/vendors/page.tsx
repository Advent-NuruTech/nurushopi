import React from "react";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/ui/Footer";
import { 
  FaStore, 
  FaClipboardList, 
  FaLeaf, 
  FaMapMarkerAlt, 
  FaCamera, 
  FaMoneyBillWave, 
  FaHandshake,
  FaChartLine,
  FaTachometerAlt,
  FaCreditCard,
  FaHeadset,
  FaRocket,
  FaCheckCircle,
  FaArrowRight
} from "react-icons/fa";

export const metadata = {
  title: "Sell on NuruShop – Become a Vendor",
  description:
    "Join NuruShop's marketplace as a vendor. Sell your natural health products, organic foods, herbs, and spiritual literature to a growing audience across Kenya.",
};

const requirements = [
  {
    title: "Registered Business",
    desc: "A legally registered business in Kenya with a valid business name and registration number.",
    icon: FaClipboardList,
  },
  {
    title: "Quality Products",
    desc: "Natural health products, organic foods, herbal remedies, or faith-inspired literature that meet our quality standards.",
    icon: FaLeaf,
  },
  {
    title: "Kenya-Based",
    desc: "Your business must be physically located in Kenya for local fulfillment and delivery coordination.",
    icon: FaMapMarkerAlt,
  },
  {
    title: "Product Photos",
    desc: "Clear, high-quality images of your products for the listings on the marketplace.",
    icon: FaCamera,
  },
  {
    title: "Pricing & Inventory",
    desc: "Competitive pricing with accurate stock levels and timely updates on availability.",
    icon: FaMoneyBillWave,
  },
  {
    title: "Customer Service",
    desc: "Responsive communication with buyers, timely order processing, and commitment to customer satisfaction.",
    icon: FaHandshake,
  },
];

const benefits = [
  {
    title: "Reach More Customers",
    desc: "Tap into NuruShop's growing audience of health-conscious and faith-driven buyers across Kenya.",
    icon: FaChartLine,
  },
  {
    title: "Easy Management",
    desc: "Simple dashboard to manage your products, orders, and payments all in one place.",
    icon: FaTachometerAlt,
  },
  {
    title: "Fast Payments",
    desc: "Reliable payment processing with timely payouts for your sales.",
    icon: FaCreditCard,
  },
  {
    title: "Marketplace Support",
    desc: "Dedicated support team to help you with onboarding, listings, and any questions.",
    icon: FaHeadset,
  },
];

const steps = [
  {
    step: "1",
    title: "Submit Your Application",
    desc: "Fill out our simple multi-step form with your business details, products, and contact information.",
  },
  {
    step: "2",
    title: "We Review & Approve",
    desc: "Our team reviews your application within 2–3 business days. We'll notify you via email once approved.",
  },
  {
    step: "3",
    title: "List Your Products",
    desc: "Upload your products with photos, descriptions, and pricing. Start selling immediately after approval.",
  },
  {
    step: "4",
    title: "Receive Orders & Grow",
    desc: "Get notified of new orders, manage fulfillment, and receive payments directly to your account.",
  },
];

export default function VendorsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-4 md:px-8 lg:px-16 pt-24 md:pt-28 pb-8 md:pb-12 transition-colors duration-300">
        <section className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="mb-10 md:mb-14 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                <FaStore className="text-4xl text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-sky-700 dark:text-emerald-400 mb-4">
              Sell on NuruShop
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Join Africa&apos;s fastest-growing marketplace for natural health,
              organic foods, and faith-inspired products. Reach thousands of
              customers across Kenya.
            </p>
            <div className="mt-8">
              <Link
                href="/vendors/register"
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 hover:-translate-y-0.5"
              >
                Become a Vendor
                <FaArrowRight className="text-sm" />
              </Link>
            </div>
          </div>

          {/* Requirements */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-2 bg-sky-500 rounded-full"></div>
              <h2 className="text-2xl md:text-3xl font-semibold text-sky-600 dark:text-emerald-400">
                What You Need
              </h2>
            </div>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
              To become a vendor on NuruShop, you&apos;ll need the following:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {requirements.map((req, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-100 dark:border-slate-700 hover:border-sky-300 dark:hover:border-emerald-500 transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-3">
                    <req.icon className="text-2xl text-sky-600 dark:text-emerald-400 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">
                        {req.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {req.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-2 bg-emerald-500 rounded-full"></div>
              <h2 className="text-2xl md:text-3xl font-semibold text-sky-600 dark:text-emerald-400">
                Why Sell With Us
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {benefits.map((b, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800/50 p-5 rounded-xl border border-sky-100 dark:border-slate-700 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <b.icon className="text-2xl text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">
                        {b.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {b.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-1 bg-sky-500 rounded-full"></div>
              <h2 className="text-2xl md:text-3xl font-semibold text-sky-600 dark:text-emerald-400">
                How It Works
              </h2>
            </div>
            <div className="space-y-4">
              {steps.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 bg-white dark:bg-slate-800 p-5 rounded-xl border border-sky-100 dark:border-slate-700"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 dark:bg-emerald-600 text-white font-bold text-lg">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-br from-sky-500/10 via-emerald-500/10 to-transparent dark:from-sky-900/20 dark:via-emerald-900/20 p-8 md:p-10 rounded-2xl border-2 border-sky-200 dark:border-emerald-900/50 text-center">
            <div className="flex justify-center mb-4">
              <FaRocket className="text-4xl text-sky-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-sky-700 dark:text-emerald-400 mb-4">
              Ready to Start Selling?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-8">
              Join dozens of vendors already growing their business on NuruShop.
              Apply today and start reaching customers across Kenya.
            </p>
            <Link
              href="/vendors/register"
              className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 hover:-translate-y-0.5"
            >
              Become a Vendor
              <FaArrowRight className="text-sm" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
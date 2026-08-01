"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FaChevronDown,
  FaStore,
  FaShoppingBag,
  FaCreditCard,
  FaTruck,
  FaUndo,
  FaPrayingHands,
  FaBoxOpen,
  FaStoreAlt,
  FaWallet,
  FaHeadset,
  FaSearch,
  FaWhatsapp,
  FaPhoneAlt,
  FaEnvelope,
} from "react-icons/fa";

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

interface FaqCategory {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: FaqItem[];
}

const faqCategories: FaqCategory[] = [
  {
    title: "General Questions",
    icon: FaStore,
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
    items: [
      {
        q: "What is NuruShop?",
        a: (
          <p>
            NuruShop is one of Kenya&apos;s leading online marketplaces for natural products,
            organic foods, herbs and spices, essential oils, healthy living products, and
            faith-based literature. Our tagline is{" "}
            <strong>&quot;Health &amp; Truth&quot;</strong> — we exist to reconnect people with the
            pure, simple, and healing principles of nature as originally designed by the Creator.
          </p>
        ),
      },
      {
        q: "Who operates NuruShop?",
        a: (
          <p>
            NuruShop is built and operated under the vision of{" "}
            <a
              href="https://adventnurutech.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-emerald-400 hover:underline"
            >
              Advent NuruTech
            </a>{" "}
            — a technology company that blends modern tech with timeless values of integrity,
            service, and wellness.
          </p>
        ),
      },
      {
        q: "What kind of products does NuruShop sell?",
        a: (
          <>
            <p>We stock a carefully curated range of natural and faith-inspired goods, including:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Natural products &amp; health reform products</li>
              <li>Organic foods and superfoods (e.g., flax seeds, peanut butter, soya products)</li>
              <li>Herbs and spices (e.g., turmeric powder, garlic powder, hibiscus powder, Himalayan pink salt)</li>
              <li>Essential oils</li>
              <li>Christian literature — EGW books, pioneer writings, and spiritual books</li>
            </ul>
          </>
        ),
      },
      {
        q: "Is NuruShop a physical store?",
        a: (
          <p>
            NuruShop is an online marketplace based in Kenya. Orders are placed on the website
            (nurushop.co.ke) and products are delivered to your door by the seller or our
            coordinated riders. Our support team works on establishing pickup stations for your
            convenience.
          </p>
        ),
      },
      {
        q: "Is NuruShop legit and safe to use?",
        a: (
          <p>
            Yes. NuruShop is operated by Advent NuruTech and connects registered sellers with
            buyers across Kenya. Your data and transactions are protected, communication is
            encrypted, and we never ask for personal information unrelated to your business with
            us. Always pay through the official NuruShop payment channels — never to a third party.
          </p>
        ),
      },
      {
        q: "Does NuruShop ship outside Kenya?",
        a: (
          <p>
            Checkout supports many countries around the world (Kenya, Uganda, Tanzania, Rwanda,
            Ethiopia, South Africa, the United States, the UK, and more). International delivery
            is confirmed by our customer care team before your order is approved so you always
            know the exact cost and timeline.
          </p>
        ),
      },
    ],
  },
  {
    title: "Ordering & Checkout",
    icon: FaShoppingBag,
    color: "text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/30",
    items: [
      {
        q: "How do I place an order?",
        a: (
          <p>
            Browse the <Link href="/shop" className="text-sky-600 dark:text-emerald-400 hover:underline">Shop</Link>{" "}
            page, add products to your cart, then open the cart and go to checkout. Sign in (or
            create an account), fill in your delivery details (full name, phone, country,
            county/state, and exact locality), and submit. You&apos;ll receive an order number and a
            confirmation via WhatsApp or Email.
          </p>
        ),
      },
      {
        q: "Do I need an account to place an order?",
        a: (
          <p>
            Yes. You need to be signed in to complete an order so we can save your order history
            and deliver securely. You can create a free account in a few minutes and it will let
            you track orders, manage your wallet, and get support faster.
          </p>
        ),
      },
      {
        q: "How will I know my order was received?",
        a: (
          <p>
            Once you submit an order you receive a unique order number. Our team confirms the
            order via WhatsApp and/or Email, and we open a WhatsApp chat so you can follow up. You
            can also review your orders anytime under{" "}
            <Link href="/myoders" className="text-sky-600 dark:text-emerald-400 hover:underline">My Orders</Link>.
          </p>
        ),
      },
      {
        q: "Can I track my order?",
        a: (
          <p>
            Yes — visit{" "}
            <Link href="/myoders" className="text-sky-600 dark:text-emerald-400 hover:underline">My Orders</Link>{" "}
            or your profile to see your order history and status. For live updates, message us on
            WhatsApp with your order number.
          </p>
        ),
      },
      {
        q: "What if my cart is empty when I open checkout?",
        a: (
          <p>
            Head back to the shop, add some products, and return to checkout. The cart shows the
            total quantity and subtotal before you place an order.
          </p>
        ),
      },
      {
        q: "Can I cancel an order?",
        a: (
          <p>
            Contact our support team as soon as possible after placing the order. If the order has
            not yet been dispatched, we will do our best to cancel it and refund any payment.
          </p>
        ),
      },
    ],
  },
  {
    title: "Payments",
    icon: FaCreditCard,
    color: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30",
    items: [
      {
        q: "What payment methods do you accept?",
        a: (
          <p>
            We accept <strong>M-Pesa</strong> and <strong>cash on delivery</strong>. For cash
            delivery, you can pay the rider when your order arrives. M-Pesa payments are made to
            the official NuruShop number: <strong>0759167209</strong>.
          </p>
        ),
      },
      {
        q: "Do I pay the seller directly?",
        a: (
          <p>
            <strong>No.</strong> Always send payment to the official NuruShop account (product
            price + delivery fee). NuruShop confirms the payment and later transfers the
            seller&apos;s amount after deducting our commission. Direct buyer-to-seller payment is
            not allowed unless specifically authorized by NuruShop.
          </p>
        ),
      },
      {
        q: "Is it safe to send money for my order?",
        a: (
          <p>
            Yes — as long as you pay only through the official NuruShop channels shared by our
            team. We confirm every payment and will never ask you to pay a personal number or a
            random third party. If in doubt, verify on WhatsApp before paying.
          </p>
        ),
      },
      {
        q: "Can I use my NuruShop wallet balance?",
        a: (
          <p>
            If you have a wallet balance (earned from referrals, refunds, or adjustments), you can
            apply it at checkout to reduce what you pay. The wallet is shown in your profile under
            the Wallet tab.
          </p>
        ),
      },
      {
        q: "Are there any extra charges?",
        a: (
          <p>
            The only additional charge is the delivery (parceling) fee, which depends on your
            distance and the seller&apos;s delivery method. You are always informed of the delivery
            fee before you pay — we always choose the cheapest reliable option.
          </p>
        ),
      },
    ],
  },
  {
    title: "Delivery & Shipping",
    icon: FaTruck,
    color: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30",
    items: [
      {
        q: "Do you deliver to my area?",
        a: (
          <p>
            We deliver to your convenience across Kenya. During checkout, provide your country,
            county/state, and exact locality, and our customer care team will confirm delivery to
            your exact location before the order is approved.
          </p>
        ),
      },
      {
        q: "How much does delivery cost?",
        a: (
          <p>
            Delivery cost depends on the distance and the seller&apos;s delivery method. We confirm
            the exact fee with you before you make payment so there are no surprises. Delivery fees
            become non-refundable once delivery has started.
          </p>
        ),
      },
      {
        q: "Who delivers my order?",
        a: (
          <p>
            The seller/product owner is responsible for arranging delivery, with NuruShop
            coordinating and confirming your location. Sellers follow agreed terms with both the
            buyer and the rider.
          </p>
        ),
      },
      {
        q: "How long will delivery take?",
        a: (
          <p>
            Delivery time depends on the seller&apos;s schedule, your distance, and transport
            conditions. NuruShop is not responsible for delays caused by weather, transport, or
            seller schedules, but we do everything possible to keep you updated.
          </p>
        ),
      },
      {
        q: "Can I pick up my order instead of delivery?",
        a: (
          <p>
            We are working on establishing pickup stations. For now, ask our support team on
            WhatsApp about pickup options available in your area.
          </p>
        ),
      },
    ],
  },
  {
    title: "Refunds & Returns",
    icon: FaUndo,
    color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
    items: [
      {
        q: "What if the seller never delivers my order?",
        a: (
          <p>
            If the seller fails to deliver after you&apos;ve paid, NuruShop refunds you{" "}
            <strong>in full</strong>. Just contact our support team with your order number.
          </p>
        ),
      },
      {
        q: "What if I receive a different item than what I ordered?",
        a: (
          <p>
            If you receive an item that is completely different from what was advertised, NuruShop
            reviews the case and decides whether a full or partial refund applies. Make sure to
            inspect your items upon delivery.
          </p>
        ),
      },
      {
        q: "Are delivery fees refundable?",
        a: (
          <p>
            Parceling/delivery fees are non-refundable once delivery has started, even if a
            product refund is granted.
          </p>
        ),
      },
      {
        q: "How do I request a refund?",
        a: (
          <p>
            Refund requests must be made <strong>within 24 hours after delivery</strong>. Contact
            us via WhatsApp, email, or the contact form with your order number and a description of
            the issue, and our team will handle it promptly.
          </p>
        ),
      },
      {
        q: "I received a damaged or incorrect item — what now?",
        a: (
          <p>
            Report it within 24 hours of delivery with photos. NuruShop will mediate between you
            and the seller and arrange a refund, replacement, or partial refund depending on the
            review outcome.
          </p>
        ),
      },
    ],
  },
  {
    title: "Sabbath & Store Hours",
    icon: FaPrayingHands,
    color: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30",
    items: [
      {
        q: "What is NuruShop's Sabbath policy?",
        a: (
          <p>
            NuruShop honors the Sabbath as a sacred time of rest. Purchasing and checkout are
            paused from <strong>Friday sunset (5:00 PM) until Saturday evening (6:30 PM)</strong>{" "}
            in your local time. You can still browse the store, but orders are processed once the
            Sabbath ends.
          </p>
        ),
      },
      {
        q: "Can I place an order during the Sabbath?",
        a: (
          <p>
            No — checkout is disabled during the Sabbath window in honor of the day of rest. You
            will see a message showing when shopping resumes. We encourage everyone to use the time
            for worship, family, and reflection.
          </p>
        ),
      },
      {
        q: "What are the Sabbath Archives?",
        a: (
          <p>
            Each Sabbath we publish a devotional message for the community. You can read the current
            message and explore the full history on the{" "}
            <Link href="/sabbath-archives" className="text-sky-600 dark:text-emerald-400 hover:underline">Sabbath Archives</Link>{" "}
            page.
          </p>
        ),
      },
      {
        q: "When is NuruShop support available?",
        a: (
          <p>
            Our support hours are <strong>Sunday to Friday</strong> (Saturday is closed in honor of
            the Sabbath). Sunday through Thursday we are available around the clock, and on Friday
            we are available until the Sabbath begins at sunset.
          </p>
        ),
      },
    ],
  },
  {
    title: "Wholesale & Bulk Orders",
    icon: FaBoxOpen,
    color: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30",
    items: [
      {
        q: "What is wholesale on NuruShop?",
        a: (
          <p>
            Wholesale lets you buy products in bulk at a discounted per-unit price. Every wholesale
            item shows its unit price and a minimum quantity you must order. Visit the{" "}
            <Link href="/wholeseller" className="text-sky-600 dark:text-emerald-400 hover:underline">Wholesale</Link>{" "}
            page to browse available bulk items.
          </p>
        ),
      },
      {
        q: "How do I place a wholesale order?",
        a: (
          <p>
            Browse the wholesale catalog, note the minimum quantity for each item, and contact our
            team on WhatsApp with the items and quantities you need. We&apos;ll confirm availability,
            pricing, and delivery arrangements for your bulk order.
          </p>
        ),
      },
      {
        q: "Can I get a better price for very large orders?",
        a: (
          <p>
            Yes — for very large bulk orders, message our team and we may be able to negotiate
            better pricing and delivery terms depending on the product and quantity.
          </p>
        ),
      },
    ],
  },
  {
    title: "Selling on NuruShop (Vendors)",
    icon: FaStoreAlt,
    color: "text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30",
    items: [
      {
        q: "How do I become a vendor on NuruShop?",
        a: (
          <p>
            Apply through the{" "}
            <Link href="/vendors/register" className="text-sky-600 dark:text-emerald-400 hover:underline">Vendor Registration</Link>{" "}
            form. You&apos;ll need a registered business in Kenya, quality natural/faith-based
            products, clear product photos, accurate pricing and inventory, and a commitment to
            good customer service.
          </p>
        ),
      },
      {
        q: "How long does vendor approval take?",
        a: (
          <p>
            Our team reviews applications within <strong>2–3 business days</strong> and notifies you
            by email once approved. After approval you can upload products and start selling.
          </p>
        ),
      },
      {
        q: "What commission does NuruShop charge sellers?",
        a: (
          <>
            <p>Commission is deducted before the seller is paid:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Items below KSh 300 — a minimum commission of KSh 20</li>
              <li>Items of KSh 300 and above — 10% commission</li>
            </ul>
          </>
        ),
      },
      {
        q: "How and when do I get paid as a vendor?",
        a: (
          <p>
            Once a buyer pays the official NuruShop account, we confirm the payment and transfer
            the seller&apos;s amount after deducting our commission. Payment details (bank/M-Pesa)
            are collected in your vendor profile.
          </p>
        ),
      },
      {
        q: "What products am I allowed to sell?",
        a: (
          <p>
            Natural health products, organic foods, herbal remedies, essential oils, health reform
            items, and faith-inspired literature. Descriptions and prices must be accurate, images
            must truly represent the product, and items must be available and in good condition.
            False listings may lead to suspension.
          </p>
        ),
      },
    ],
  },
  {
    title: "Account, Wallet & Referrals",
    icon: FaWallet,
    color: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30",
    items: [
      {
        q: "How do I create an account?",
        a: (
          <p>
            Click{" "}
            <Link href="/auth/signup" className="text-sky-600 dark:text-emerald-400 hover:underline">Sign Up</Link>{" "}
            and register with your email and password, then verify your email to get started. Your
            account gives you order history, wallet access, and faster checkout.
          </p>
        ),
      },
      {
        q: "What is the NuruShop wallet?",
        a: (
          <p>
            The wallet stores balances you can apply to future orders at checkout. It is credited
            through referral rewards, refunds, and support adjustments. You can view your balance
            and transaction history in your profile under the Wallet tab.
          </p>
        ),
      },
      {
        q: "How do referrals work?",
        a: (
          <p>
            Every user has a personal referral code (found in your profile). When a friend signs up
            using your code, you earn a reward in your wallet once the referral is completed. Share
            your code with friends and family to grow your balance.
          </p>
        ),
      },
      {
        q: "How do I cash out my wallet balance?",
        a: (
          <p>
            From the Wallet tab in your profile, request a redemption (cash-out) by choosing a
            payout method (e.g., M-Pesa) and entering the amount. NuruShop reviews and processes
            approved redemptions to your payout method.
          </p>
        ),
      },
      {
        q: "I forgot my password — what should I do?",
        a: (
          <p>
            Use the{" "}
            <Link href="/auth/reset-password" className="text-sky-600 dark:text-emerald-400 hover:underline">Reset Password</Link>{" "}
            page. Enter your email and follow the link we send to set a new password.
          </p>
        ),
      },
    ],
  },
  {
    title: "Contact & Support",
    icon: FaHeadset,
    color: "text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30",
    items: [
      {
        q: "How can I contact NuruShop?",
        a: (
          <>
            <p>There are several ways to reach us:</p>
            <ul className="mt-2 space-y-1">
              <li>
                <FaWhatsapp className="inline mr-1 text-green-600" /> WhatsApp:{" "}
                <a href="https://wa.me/254105178685" target="_blank" rel="noopener noreferrer" className="text-sky-600 dark:text-emerald-400 hover:underline">+254 105 178 685</a>
              </li>
            <li>
              <FaPhoneAlt className="inline mr-1 text-sky-600" /> Phone:{" "}
              <a href="tel:+254759167209" className="text-sky-600 dark:text-emerald-400 hover:underline">+254 759 167 209</a>
            </li>
            <li>
              <FaEnvelope className="inline mr-1 text-rose-600" /> Email:{" "}
              <a href="mailto:nurushoponline@gmail.com" className="text-sky-600 dark:text-emerald-400 hover:underline">nurushoponline@gmail.com</a>
            </li>
              <li>
                Contact form:{" "}
                <Link href="/contact" className="text-sky-600 dark:text-emerald-400 hover:underline">/contact</Link>
              </li>
            </ul>
          </>
        ),
      },
      {
        q: "How fast do you respond?",
        a: (
          <p>
            We typically respond within 24 hours during business days (Sunday to Friday). For
            urgent issues, call us or message us on WhatsApp for the fastest reply.
          </p>
        ),
      },
      {
        q: "I have a dispute with a seller — who do I talk to?",
        a: (
          <p>
            NuruShop acts as a mediator in disputes. Contact our support team with your order
            number and a clear explanation, and our team will review the case fairly, prioritizing
            honesty and platform integrity.
          </p>
        ),
      },
      {
        q: "Where can I read the full policies?",
        a: (
          <p>
            You can read our{" "}
            <Link href="/terms" className="text-sky-600 dark:text-emerald-400 hover:underline">Terms &amp; Conditions</Link>
            ,{" "}
            <Link href="/privacy" className="text-sky-600 dark:text-emerald-400 hover:underline">Privacy Policy</Link>
            , and{" "}
            <Link href="/shipping-policy" className="text-sky-600 dark:text-emerald-400 hover:underline">Shipping Policy</Link>{" "}
            anytime from the footer.
          </p>
        ),
      },
    ],
  },
];

function FaqItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
      >
        <span className="font-semibold text-slate-800 dark:text-slate-100">{item.q}</span>
        <FaChevronDown
          className={`flex-shrink-0 text-sky-600 dark:text-emerald-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`px-5 overflow-hidden transition-all duration-300 ${open ? "max-h-96 pb-5" : "max-h-0"}`}
      >
        <div className="text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">{item.a}</div>
      </div>
    </div>
  );
}

export default function FaqPage() {
  const [query, setQuery] = useState("");
  const [openCategory, setOpenCategory] = useState<string | null>("General Questions");

  const filtered = query.trim().toLowerCase();

  const visibleCategories = faqCategories
    .map((cat) => ({
      ...cat,
      items: filtered
        ? cat.items.filter(
            (item) =>
              item.q.toLowerCase().includes(filtered) ||
              (typeof item.a === "string" && item.a.toLowerCase().includes(filtered))
          )
        : cat.items,
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <main className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-4 md:px-8 lg:px-16 pt-20 md:pt-24 pb-8 md:pb-12 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-2 bg-emerald-500 rounded-full"></div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-sky-700 dark:text-emerald-400">
              Frequently Asked Questions
            </h1>
          </div>
          <div className="h-1 w-20 bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full mb-4"></div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
            Everything you need to know about shopping, payments, delivery, selling, and more on
            NuruShop. Can&apos;t find your answer?{" "}
            <Link href="/contact" className="text-sky-600 dark:text-emerald-400 hover:underline">
              Contact our support team
            </Link>
            .
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search frequently asked questions..."
            className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>

        {visibleCategories.length === 0 && (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            No results found for &quot;{query}&quot;. Try different keywords or{" "}
            <Link href="/contact" className="text-sky-600 dark:text-emerald-400 hover:underline">
              ask us directly
            </Link>
            .
          </div>
        )}

        {/* Categories */}
        <div className="space-y-8">
          {visibleCategories.map((cat) => {
            const isOpen = !filtered && openCategory === cat.title;
            return (
              <section key={cat.title}>
                <button
                  type="button"
                  onClick={() => setOpenCategory((prev) => (prev === cat.title ? null : cat.title))}
                  className="w-full flex items-center gap-3 mb-4 text-left"
                >
                  <div className={`p-2 rounded-lg ${cat.color}`}>
                    <cat.icon className="text-xl" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-semibold text-sky-600 dark:text-emerald-400 flex-1">
                    {cat.title}
                  </h2>
                  <FaChevronDown
                    className={`text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <div className="space-y-3">
                  {cat.items.map((item) => (
                    <FaqItem key={item.q} item={item} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Still have questions */}
        <div className="mt-12 bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800/50 p-8 rounded-2xl border border-sky-100 dark:border-slate-700 text-center">
          <h3 className="text-2xl font-bold text-sky-700 dark:text-emerald-400 mb-2">
            Still have questions?
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-xl mx-auto">
            Our friendly support team is ready to help you with any question about your order,
            delivery, selling, or anything else. Reach out and we&apos;ll reply within 24 hours.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
            >
              Contact Us
            </Link>
            <a
              href="https://wa.me/254105178685?text=Hello%21%20I%20have%20a%20question%20about%20NuruShop."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-sky-300 dark:border-emerald-500 text-sky-700 dark:text-emerald-400 hover:bg-sky-50 dark:hover:bg-slate-700 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <FaWhatsapp className="text-green-600" />
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

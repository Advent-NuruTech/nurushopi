import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  Headphones,
  Mail,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";

const quickLinks = [
  { label: "Shop all", href: "/shop" },
  { label: "About us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Sabbath archives", href: "/sabbath-archives" },
  { label: "FAQs", href: "/faq" },
] as const;

const benefits = [
  { Icon: ShieldCheck, title: "Secure payments", description: "Protected checkout" },
  { Icon: Heart, title: "Natural products", description: "Pure and authentic" },
  { Icon: Truck, title: "Reliable delivery", description: "Across Kenya" },
  { Icon: Headphones, title: "Helpful support", description: "Sunday to Friday" },
] as const;

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="min-w-0 max-w-full overflow-hidden border-t border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-gray-950 dark:text-slate-400">
      <div className="mx-auto min-w-0 max-w-7xl px-4 pb-24 pt-10 sm:pt-12 lg:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr_1fr] lg:gap-12">
          <div className="max-w-md">
            <Link href="/" className="inline-flex items-center gap-3" aria-label="NuruShop home">
              <Image
                src="/assets/logo.png"
                alt="NuruShop logo"
                width={44}
                height={44}
                className="rounded-full object-cover"
              />
              <span className="text-xl font-bold text-slate-900 dark:text-white">NuruShop</span>
            </Link>
            <p className="mt-4 text-sm leading-6">
              A trusted marketplace for natural health products, organic foods, and faith-inspired
              resources.
            </p>
            <Link
              href="/shop"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-600 transition-colors hover:text-sky-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              <ShoppingBag className="h-4 w-4" />
              Start shopping
            </Link>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-8 min-[440px]:grid-cols-2 sm:gap-12 lg:contents">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Quick links</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="transition-colors hover:text-sky-600 dark:hover:text-emerald-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Get in touch</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <a
                    href="https://wa.me/254142225233"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 transition-colors hover:text-sky-600 dark:hover:text-emerald-400"
                  >
                    <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>WhatsApp us</span>
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:nurushoponline@gmail.com"
                    className="flex min-w-0 items-start gap-2 transition-colors hover:text-sky-600 dark:hover:text-emerald-400"
                  >
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-all">nurushoponline@gmail.com</span>
                  </a>
                </li>
              </ul>
              <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-500">
                Support available Sunday–Friday
              </p>
            </div>
          </div>
        </div>

        <section
          className="mt-10 border-t border-slate-200 pt-8 dark:border-slate-800"
          aria-labelledby="footer-benefits"
        >
          <h2 id="footer-benefits" className="text-sm font-bold text-slate-900 dark:text-white">
            Why choose us
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ Icon, title, description }) => (
              <div
                key={title}
                className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-emerald-950 dark:text-emerald-400">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold leading-5 text-slate-900 sm:text-sm dark:text-white">
                    {title}
                  </span>
                  <span className="block text-xs leading-5 text-slate-500">{description}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p>© {currentYear} NuruShop. Health &amp; Truth.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-sky-600 dark:hover:text-emerald-400">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-sky-600 dark:hover:text-emerald-400">
              Terms
            </Link>
            <Link
              href="/shipping-policy"
              className="hover:text-sky-600 dark:hover:text-emerald-400"
            >
              Shipping
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a
            href="https://wa.me/254142225233?text=Hello%20Advent%20NuruTech%20Services%2C%20I%20would%20like%20your%20software%20services."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-center text-xs font-semibold text-sky-700 transition-colors hover:border-sky-300 hover:bg-sky-100 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:border-emerald-800 dark:hover:bg-emerald-950"
          >
            <MessageCircle className="h-4 w-4" />
            Designed by Advent NuruTech Services
          </a>
        </div>
      </div>
    </footer>
  );
}

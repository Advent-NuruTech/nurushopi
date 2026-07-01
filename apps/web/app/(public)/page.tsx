// ./app/(public)/page.tsx
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CreditCard, Headphones, PackageSearch, Truck } from "lucide-react";
import HeroSection from "@/components/ui/HeroSection";
import FeaturedSection from "@/components/ui/FeaturedSection";
import FeaturedHero from "@/components/ui/FeaturedHero";
import NewArrivals from "@/components/ui/NewArrivals";
import Bannerss from "@/components/ui/Bannerss";
import SabbathExperience from "@/components/ui/SabbathExperience";
import SectionHeader from "@/components/ui/SectionHeader";
import { formatPrice } from "@/lib/formatPrice";
import {
  listProducts,
  listCategories,
  listNewArrivals,
  listBanners,
} from "@/lib/data/catalog";
import { listWholesaleItems } from "@/lib/data/wholesale";
import type { ProductCardVM } from "@/lib/view/catalog";

// Storefront is served from the Data Cache (ISR). The data-layer functions set
// per-collection `revalidate` windows and cache tags; admin writes purge them
// instantly via POST /api/revalidate. No `force-dynamic` needed.

/** Adapt a card VM to the shape the Featured* carousels expect. */
function toFeaturedProduct(p: ProductCardVM) {
  return {
    id: p.id,
    name: p.name,
    image: p.image,
    category: p.categorySlug ?? "",
    price: p.price,
    originalPrice: p.originalPrice,
    sellingPrice: p.sellingPrice,
    shortDescription: p.shortDescription ?? undefined,
    inStock: p.inStock,
    createdAt: p.createdAtMs,
  };
}

export default async function HomePage() {
  const [productsResult, categories, newArrivals, banners, wholesaleResult, mostViewedResult] =
    await Promise.all([
      listProducts({ pageSize: 60, sort: "newest" }),
      listCategories(),
      listNewArrivals(12),
      listBanners(),
      listWholesaleItems({ pageSize: 12, sort: "newest" }),
      listProducts({ pageSize: 12, sort: "most_viewed_today", inStock: true }),
    ]);

  const featuredProducts = productsResult.items.map(toFeaturedProduct);
  const mostViewed = mostViewedResult.items.map(toFeaturedProduct);
  const categoryOptions = categories.map((c) => ({ name: c.name, slug: c.slug }));
  const wholesaleProducts = wholesaleResult.items;
  const heroProduct = featuredProducts[0] ?? newArrivals[0];
  const topCategories =
    categories.length > 0
      ? categories.slice(0, 8)
      : [
          { id: "beauty", name: "Beauty", slug: "beauty" },
          { id: "wellness", name: "Wellness", slug: "wellness" },
          { id: "fashion", name: "Fashion", slug: "fashion" },
          { id: "home", name: "Home", slug: "home" },
          { id: "electronics", name: "Electronics", slug: "electronics" },
          { id: "gifts", name: "Gifts", slug: "gifts" },
        ];

  return (
    <main className="bg-slate-50 dark:bg-black">
      <HeroSection />
      <section className="bg-white pt-24 dark:bg-gray-950">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-[260px_1fr_280px]">
          <aside className="hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-gray-900 lg:block">
            <div className="mb-2 flex items-center gap-2 px-2 text-sm font-bold text-slate-900 dark:text-white">
              <PackageSearch size={18} />
              Top categories
            </div>
            <div className="space-y-1">
              {topCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/shop?category=${encodeURIComponent(category.slug)}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {category.name}
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </aside>

          <div className="relative min-h-[420px] overflow-hidden rounded-lg bg-slate-900 text-white shadow-sm">
            <Image
              src={heroProduct?.image ?? "/assets/logo.jpg"}
              alt={heroProduct?.name ?? "NuruShop featured products"}
              fill
              className="object-contain object-right-bottom p-6 opacity-80 sm:p-10"
              priority
              sizes="(max-width: 1024px) 100vw, 700px"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-900/20" />
            <div className="relative flex min-h-[420px] max-w-xl flex-col justify-center p-6 sm:p-10">
              <p className="mb-3 w-fit rounded-full bg-emerald-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-950">
                NuruShop marketplace
              </p>
              <h1 className="text-3xl font-black leading-tight sm:text-5xl">
                Shop trusted deals, fast delivery, and everyday essentials.
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-200 sm:text-base">
                Discover fresh arrivals, best-selling categories, wholesale picks, and secure checkout in one modern store.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 rounded-md bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600"
                >
                  Start shopping <ArrowRight size={17} />
                </Link>
                <Link
                  href="/wholeseller"
                  className="inline-flex items-center gap-2 rounded-md border border-white/40 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  Wholesale deals
                </Link>
              </div>
            </div>
          </div>

          <aside className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Truck, title: "Fast delivery", text: "Clear fulfillment for local and national orders." },
              { icon: CreditCard, title: "Secure checkout", text: "Protected payments, wallet support, and order records." },
              { icon: Headphones, title: "Customer care", text: "WhatsApp-friendly ordering and responsive support." },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-gray-900"
              >
                <item.icon className="mb-3 text-blue-700 dark:text-blue-400" size={22} />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.text}</p>
              </div>
            ))}
          </aside>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {topCategories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${encodeURIComponent(category.slug)}`}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-gray-900 dark:text-slate-200"
              >
                <BadgeCheck size={15} />
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <SabbathExperience />
      <NewArrivals products={newArrivals} />

      {mostViewed.length > 0 && (
        <FeaturedSection products={mostViewed} categories={categoryOptions} title="Most Viewed Today" />
      )}

      <FeaturedHero products={featuredProducts} categories={categoryOptions} />

      {wholesaleProducts.length > 0 && (
        <section className="py-6 bg-white dark:bg-black">
          <div className="max-w-7xl mx-auto px-2 sm:px-6">
            <div className="mb-3">
              <SectionHeader title="Wholesale Picks" href="/wholeseller" />
            </div>

            <div className="grid grid-flow-col auto-cols-[minmax(160px,1fr)] sm:auto-cols-[minmax(200px,1fr)] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {wholesaleProducts.map((product) => (
                <Link
                  key={product.id}
                  href={product.href}
                  className="group bg-white dark:bg-gray-900 rounded-xl border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm hover:shadow-md transition snap-start"
                >
                  <div className="relative w-full pt-[100%] overflow-hidden bg-blue-50 dark:bg-blue-950/30 rounded-t-xl">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    />

                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase rounded-full">
                        Wholesale
                      </span>
                    </div>
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm line-clamp-2">
                      {product.name}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Min: {product.minQuantity} unit
                    </p>

                    <p className="text-blue-600 dark:text-blue-400 font-bold text-base mt-2">
                      {formatPrice(product.unitPrice)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Bannerss banners={banners} />

      <FeaturedSection products={featuredProducts} categories={categoryOptions} />
    </main>
  );
}

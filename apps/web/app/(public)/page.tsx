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
      ? categories.slice(0, 24)
      : [
          { id: "beauty", name: "Beauty", slug: "beauty", image: "/assets/logo.png" },
          { id: "wellness", name: "Wellness", slug: "wellness", image: "/assets/logo.png" },
          { id: "fashion", name: "Fashion", slug: "fashion", image: "/assets/logo.png" },
          { id: "home", name: "Home", slug: "home", image: "/assets/logo.png" },
          { id: "gifts", name: "Gifts", slug: "gifts", image: "/assets/logo.png" },
        ];

  return (
    <main className="bg-slate-50 dark:bg-black">
      <HeroSection />
      
      <SabbathExperience />
      <NewArrivals products={newArrivals} />

      <section className="bg-white py-6 dark:bg-black" aria-labelledby="shop-categories">
        <div className="mx-auto max-w-7xl px-2 sm:px-6">
          <div className="mb-3">
            <SectionHeader title="Shop by Category" href="/shop" />
          </div>
          <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-5 sm:gap-4 lg:grid-cols-8">
            {topCategories.map((category, index) => (
              <Link
                key={category.id}
                href={`/shop?category=${encodeURIComponent(category.slug)}`}
                className={`group min-w-0 text-center ${index >= 12 ? "hidden sm:block" : ""} ${index >= 15 ? "sm:hidden lg:block" : ""}`}
              >
                <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-xl bg-slate-50 shadow-sm ring-1 ring-slate-200 transition group-hover:-translate-y-0.5 group-hover:shadow-md dark:bg-slate-900 dark:ring-slate-700">
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 639px) 25vw, (max-width: 1023px) 20vw, 12.5vw"
                  />
                </div>
                <h2 id={index === 0 ? "shop-categories" : undefined} className="mt-2 truncate text-xs font-medium text-slate-800 sm:text-sm dark:text-slate-200">
                  {category.name}
                </h2>
              </Link>
            ))}
          </div>
        </div>
      </section>

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

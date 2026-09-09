import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, BadgeCheck, Leaf, ShoppingBasket, Sparkles } from "lucide-react";

import FeaturedSection from "@/components/ui/FeaturedSection";
import ShareButton from "@/components/ui/ShareButton";
import { listBanners, listCategories, listProducts } from "@/lib/data/catalog";
import type { BannerVM, ProductCardVM } from "@/lib/view/catalog";

export const metadata = {
  title: "Promotions & Offers – NuruShop",
  description: "Current promotions and special offers at NuruShop.",
};

function cleanDescription(value: string | null | undefined) {
  return (
    value
      ?.replace(/\*\*|__/g, "")
      .replace(/\s+/g, " ")
      .trim() || "A quality pick, specially selected for you."
  );
}

function toFeaturedProduct(product: ProductCardVM) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brandName: product.brandName,
    storeName: product.storeName,
    ratingSummary: product.ratingSummary,
    image: product.image,
    category: product.categorySlug ?? "",
    price: product.price,
    originalPrice: product.originalPrice,
    sellingPrice: product.sellingPrice,
    shortDescription: product.shortDescription ?? undefined,
    inStock: product.inStock,
    stock: product.stock,
    stockStatus: product.stockStatus,
    createdAt: product.createdAtMs,
    isNew: product.isNew,
  };
}

function BannerOfferCard({ banner }: { banner: BannerVM }) {
  const title = banner.title || "NuruShop offer";

  return (
    <article className="relative grid min-h-[190px] grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.07)] dark:border-slate-800 dark:bg-slate-900 sm:min-h-[220px]">
      <Link
        href={banner.href}
        className="relative m-1.5 mr-0 min-w-0 overflow-hidden rounded-[1.05rem] bg-brand-surface dark:bg-[#063D1E] sm:m-3 sm:mr-0"
        aria-label={`View ${title}`}
      >
        {banner.image ? (
          <Image
            src={banner.image}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 46vw, (max-width: 1279px) 40vw, 290px"
          />
        ) : (
          <span className="grid h-full place-items-center text-brand-strong dark:text-brand-bright">
            <ShoppingBasket size={42} />
          </span>
        )}
        <span className="absolute left-2 top-2 rounded-xl bg-brand px-2.5 py-1.5 text-[10px] font-extrabold uppercase leading-tight tracking-wide text-white shadow-sm sm:left-3 sm:top-3 sm:text-xs">
          Special offer
        </span>
      </Link>

      <div className="flex min-w-0 flex-col p-2.5 pr-12 sm:p-5 sm:pr-14">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-brand-strong dark:text-brand-bright sm:text-[11px]">
          Featured promotion
        </p>
        <h2 className="mt-1 line-clamp-2 text-[18px] font-extrabold leading-[1.08] tracking-tight text-slate-950 dark:text-white sm:text-2xl">
          {title}
        </h2>
        <p className="mt-2 line-clamp-3 text-[11px] leading-4 text-slate-500 dark:text-slate-400 sm:text-sm sm:leading-5">
          {cleanDescription(banner.subtitle)}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:text-[10px]">
            <BadgeCheck size={11} className="text-brand" /> NuruShop pick
          </span>
        </div>
        <Link
          href={banner.href}
          className="mt-auto inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl bg-brand px-2 text-xs font-extrabold text-white transition hover:bg-brand-strong sm:min-h-11 sm:text-sm"
        >
          View offer <ArrowRight size={16} />
        </Link>
      </div>
      <ShareButton
        title={title}
        description={banner.subtitle}
        href={banner.href}
        className="absolute right-2 top-2 z-20 sm:right-3 sm:top-3"
      />
    </article>
  );
}

export default async function BannersPage() {
  const [banners, categories, productsResult] = await Promise.all([
    listBanners(),
    listCategories(),
    listProducts({ pageSize: 16, sort: "newest", inStock: true }),
  ]);

  return (
    <div className="-mx-2 min-h-screen bg-slate-50 pb-5 dark:bg-black sm:-mx-4 lg:-mx-8">
      <div className="mx-auto max-w-7xl px-1.5 pt-2 sm:px-6 sm:pt-7 lg:px-8">
        <header className="relative isolate min-h-[132px] overflow-hidden rounded-[1.45rem] border border-brand-border bg-gradient-to-br from-brand-surface via-white to-brand-surface-strong px-4 py-5 shadow-sm dark:border-[#0D6B34] dark:from-[#052E18] dark:via-[#073C20] dark:to-[#004D20] sm:min-h-[170px] sm:px-9 sm:py-8">
          <div className="relative z-10 max-w-[78%] sm:max-w-xl">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand sm:text-xs">
              Better value, every day
            </p>
            <h1 className="mt-2 text-[28px] font-black leading-none tracking-tight text-brand-ink dark:text-white sm:text-4xl">
              Promotions &amp; Offers
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-600 dark:text-brand-border sm:text-base">
              Fresh deals picked for you
            </p>
          </div>
          <Leaf
            className="absolute right-3 top-3 -rotate-[28deg] text-brand-strong opacity-75 sm:right-8 sm:top-5"
            size={44}
            strokeWidth={1.5}
          />
          <span className="absolute bottom-4 right-3 grid h-14 w-14 rotate-2 place-items-center rounded-[1.15rem] bg-brand-strong text-center text-[9px] font-black uppercase leading-tight text-white shadow-md sm:bottom-6 sm:right-8 sm:h-20 sm:w-20 sm:text-[11px]">
            Good food
            <br />
            brighter days
          </span>
        </header>

        <nav
          aria-label="Shop by category"
          className="scrollbar-hide -mx-1.5 flex snap-x gap-2 overflow-x-auto px-1.5 py-3 sm:mx-0 sm:gap-3 sm:px-0 sm:py-5"
        >
          <Link
            href="/banners"
            aria-current="page"
            className="inline-flex min-h-11 shrink-0 snap-start items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(0,153,51,0.22)]"
          >
            <Sparkles size={17} /> All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${encodeURIComponent(category.slug)}` as Route}
              className="inline-flex min-h-11 shrink-0 snap-start items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-extrabold text-slate-600 ring-1 ring-slate-200 transition hover:text-brand-strong dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800"
            >
              <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-brand-surface">
                <Image
                  src={category.image}
                  alt=""
                  fill
                  className="object-contain p-0.5"
                  sizes="24px"
                />
              </span>
              {category.name}
            </Link>
          ))}
        </nav>

        {banners.length > 0 ? (
          <section aria-label="Current offers" className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {banners.map((banner) => (
              <BannerOfferCard key={banner.id} banner={banner} />
            ))}
          </section>
        ) : (
          <section className="rounded-[1.35rem] border border-slate-200 bg-white px-6 py-9 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-surface text-brand-strong dark:bg-[#063D1E] dark:text-brand-bright">
              <ShoppingBasket size={23} />
            </span>
            <h2 className="mt-3 text-lg font-extrabold text-slate-950 dark:text-white">
              More offers are coming soon
            </h2>
          </section>
        )}
      </div>

      <FeaturedSection
        title="You may also like"
        products={productsResult.items.map(toFeaturedProduct)}
        preserveProductOrder
        enableFeedModules={false}
      />
    </div>
  );
}

import Link from "next/link";
import { Search, SlidersHorizontal, X } from "lucide-react";
import FeaturedSection from "@/components/ui/FeaturedSection";
import { formatCategoryLabel } from "@/lib/categoryUtils";
import { listBanners, listCategories, listProducts } from "@/lib/data/catalog";
import { listWholesaleItems } from "@/lib/data/wholesale";
import type { ProductCardVM } from "@/lib/view/catalog";

export const metadata = {
  title: "Shop – NuruShop",
  description: "Browse retail and wholesale products at NuruShop.",
};

function toFeedProduct(product: ProductCardVM) {
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

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; search?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const selectedCategory = resolved?.category
    ? decodeURIComponent(String(resolved.category)).toLowerCase().trim()
    : "";
  const selectedSearch = resolved?.search ? decodeURIComponent(String(resolved.search)).trim() : "";

  let allProducts: ProductCardVM[] = [];
  let wholesaleProducts = [] as Awaited<ReturnType<typeof listWholesaleItems>>["items"];
  let promotions = [] as Awaited<ReturnType<typeof listBanners>>;
  let categories = [] as Awaited<ReturnType<typeof listCategories>>;

  try {
    const [productsResult, wholesaleResult, bannerResult, categoryResult] = await Promise.all([
      listProducts({
        pageSize: 100,
        sort: "newest",
        search: selectedSearch || undefined,
      }),
      listWholesaleItems({ pageSize: 24, sort: "newest" }),
      listBanners(),
      listCategories(),
    ]);
    allProducts = productsResult.items;
    wholesaleProducts = wholesaleResult.items;
    promotions = bannerResult;
    categories = categoryResult;
  } catch (error) {
    console.error("Error loading products:", error);
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-20 text-center dark:bg-slate-950">
        <div className="mx-auto max-w-md rounded-3xl border border-rose-200 bg-white p-8 shadow-sm dark:border-rose-950 dark:bg-slate-900">
          <h1 className="text-2xl font-bold text-rose-600">We couldn&apos;t load the shop</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Please refresh the page or try again in a few moments.
          </p>
        </div>
      </div>
    );
  }

  const products = selectedCategory
    ? allProducts.filter((product) => product.categorySlug === selectedCategory)
    : allProducts;
  const suggestions = selectedCategory
    ? allProducts.filter((product) => product.categorySlug !== selectedCategory).slice(0, 8)
    : [];
  const hasActiveFilter = Boolean(selectedCategory || selectedSearch);
  const categoryOptions = categories.map((category) => ({
    name: category.name,
    slug: category.slug,
    image: category.image,
  }));

  return (
    <main className="-mx-2 min-h-screen bg-slate-50 dark:bg-black sm:-mx-4 lg:-mx-8">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
             
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                {selectedCategory
                  ? formatCategoryLabel(selectedCategory)
                  : selectedSearch
                    ? "Search results"
                    : "Explore the shop"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {selectedCategory
                  ? `Browse every available product in ${formatCategoryLabel(selectedCategory)}.`
                  : selectedSearch
                    ? `Products matching “${selectedSearch}”.`
                    : "Discover trusted retail products, timely offers, and selected wholesale value in one continuous collection."}
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex h-10 w-fit items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand-strong dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Back to home
            </Link>
          </div>

          {hasActiveFilter && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <SlidersHorizontal size={14} /> Active filters
              </span>
              {selectedCategory && (
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-surface px-3 py-1.5 text-xs font-semibold text-brand-strong dark:bg-[#063D1E] dark:text-brand-bright">
                  {formatCategoryLabel(selectedCategory)}
                </span>
              )}
              {selectedSearch && (
                <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-brand-surface px-3 py-1.5 text-xs font-semibold text-brand-strong dark:bg-[#063D1E] dark:text-brand-bright">
                  <Search size={13} /> <span className="max-w-48 truncate">{selectedSearch}</span>
                </span>
              )}
              <Link
                href="/shop"
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X size={13} /> Clear all
              </Link>
            </div>
          )}
        </div>
      </header>

      {products.length > 0 ? (
        <FeaturedSection
          products={products.map(toFeedProduct)}
          categories={categoryOptions}
          promotions={hasActiveFilter ? [] : promotions}
          wholesale={hasActiveFilter ? [] : wholesaleProducts}
          preserveProductOrder
          enableFeedModules={!hasActiveFilter}
        />
      ) : (
        <section className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-surface text-2xl dark:bg-[#063D1E]">
            <Search className="text-brand-strong dark:text-brand-bright" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">
            No matching products
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            Try another search or clear the active filters to browse the full collection.
          </p>
          <Link
            href="/shop"
            className="mt-5 inline-flex h-10 items-center rounded-full bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-strong"
          >
            View all products
          </Link>
        </section>
      )}

      {selectedCategory && suggestions.length > 0 && (
        <FeaturedSection
          title="You may also like"
          products={suggestions.map(toFeedProduct)}
          preserveProductOrder
          enableFeedModules={false}
        />
      )}
    </main>
  );
}

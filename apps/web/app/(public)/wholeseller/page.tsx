import Link from "next/link";
import type { Route } from "next";
import { Boxes, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";

import WholesaleGrid from "@/components/wholesale/WholesaleGrid";
import { formatCategoryLabel } from "@/lib/categoryUtils";
import { listWholesaleItems, type WholesaleSort } from "@/lib/data/wholesale";

export const metadata = {
  title: "Wholesale Products – NuruShop",
  description: "Search and filter NuruShop wholesale products by category.",
};

const PAGE_SIZE = 40;
const wholesaleSorts: WholesaleSort[] = ["newest", "oldest", "price_asc", "price_desc", "name"];

function browseHref({
  category,
  search,
  sort,
  page,
}: {
  category?: string;
  search?: string;
  sort?: WholesaleSort;
  page?: number;
}): Route {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  if (sort && sort !== "newest") params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return (query ? `/wholeseller?${query}` : "/wholeseller") as Route;
}

export default async function WholesellerPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; search?: string; sort?: string; page?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const selectedCategory = resolved?.category
    ? decodeURIComponent(String(resolved.category)).toLowerCase().trim()
    : "";
  const selectedSearch = resolved?.search ? decodeURIComponent(String(resolved.search)).trim() : "";
  const selectedSort = wholesaleSorts.includes(resolved?.sort as WholesaleSort)
    ? (resolved?.sort as WholesaleSort)
    : "newest";
  const requestedPage = Number.parseInt(resolved?.page ?? "1", 10);
  const selectedPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [results, inventory] = await Promise.all([
    listWholesaleItems({
      page: selectedPage,
      pageSize: PAGE_SIZE,
      search: selectedSearch || undefined,
      categorySlug: selectedCategory || undefined,
      sort: selectedSort,
    }),
    listWholesaleItems({ pageSize: 100, sort: "name" }),
  ]);

  const categoryMap = new Map<string, { name: string; count: number }>();
  for (const item of inventory.items) {
    if (!item.categorySlug || !item.categoryName) continue;
    const existing = categoryMap.get(item.categorySlug);
    categoryMap.set(item.categorySlug, {
      name: item.categoryName,
      count: (existing?.count ?? 0) + 1,
    });
  }
  const categories = [...categoryMap.entries()].map(([slug, value]) => ({ slug, ...value }));
  const hasActiveFilter = Boolean(selectedCategory || selectedSearch);

  return (
    <main className="-mx-2 min-h-screen bg-slate-50 pb-16 text-slate-950 dark:bg-black dark:text-white sm:-mx-4 lg:-mx-8">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-brand-strong dark:text-brand-bright">
                <Boxes size={16} /> Wholesale &amp; bulk
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {selectedCategory
                  ? formatCategoryLabel(selectedCategory)
                  : selectedSearch
                    ? "Wholesale search results"
                    : "Buy more. Save more."}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {selectedCategory
                  ? `Wholesale packs available in ${formatCategoryLabel(selectedCategory)}.`
                  : selectedSearch
                    ? `Wholesale products matching “${selectedSearch}”.`
                    : "Explore bulk-ready products with clear minimum quantities and per-unit pricing."}
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex h-10 w-fit items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand-strong dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Shop retail
            </Link>
          </div>

          <form
            action="/wholeseller"
            className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_190px_auto] dark:border-slate-800 dark:bg-slate-900"
          >
            {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
            <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-surface-strong dark:border-slate-700 dark:bg-slate-950">
              <Search size={17} className="shrink-0 text-slate-400" />
              <span className="sr-only">Search wholesale products</span>
              <input
                name="search"
                defaultValue={selectedSearch}
                placeholder="Search wholesale only"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
              <SlidersHorizontal size={16} className="text-slate-400" />
              <span className="sr-only">Sort wholesale products</span>
              <select
                name="sort"
                defaultValue={selectedSort}
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="name">Name A–Z</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
            <button
              type="submit"
              className="h-11 rounded-xl bg-brand px-6 text-sm font-bold text-white transition hover:bg-brand-strong"
            >
              Apply
            </button>
          </form>

          <nav aria-label="Wholesale categories" className="mt-5 flex gap-2 overflow-x-auto pb-1">
            <Link
              href={browseHref({ search: selectedSearch, sort: selectedSort })}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${!selectedCategory ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand-border hover:text-brand-strong dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
            >
              All wholesale <span className="opacity-75">({inventory.total})</span>
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={browseHref({
                  category: category.slug,
                  search: selectedSearch,
                  sort: selectedSort,
                })}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${selectedCategory === category.slug ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand-border hover:text-brand-strong dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
              >
                {category.name} <span className="opacity-75">({category.count})</span>
              </Link>
            ))}
          </nav>

          {hasActiveFilter && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Wholesale filters
              </span>
              {selectedCategory && (
                <span className="rounded-full bg-brand-surface px-3 py-1.5 text-xs font-semibold text-brand-strong dark:bg-[#063D1E] dark:text-brand-bright">
                  {formatCategoryLabel(selectedCategory)}
                </span>
              )}
              {selectedSearch && (
                <span className="max-w-56 truncate rounded-full bg-brand-surface px-3 py-1.5 text-xs font-semibold text-brand-strong dark:bg-[#063D1E] dark:text-brand-bright">
                  “{selectedSearch}”
                </span>
              )}
              <Link
                href="/wholeseller"
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X size={13} /> Clear all
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-3 py-7 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand-strong dark:text-brand-bright">
              Bulk catalogue
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              {results.total} wholesale {results.total === 1 ? "product" : "products"}
            </h2>
          </div>
          <p className="hidden text-xs text-slate-500 sm:block">Prices shown per unit</p>
        </div>

        {results.items.length ? (
          <WholesaleGrid products={results.items} />
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-surface text-brand-strong dark:bg-[#063D1E] dark:text-brand-bright">
              <Search size={24} />
            </span>
            <h2 className="mt-4 text-xl font-bold">No wholesale products found</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Try a different wholesale search or clear the category filter.
            </p>
            <Link
              href="/wholeseller"
              className="mt-5 inline-flex h-10 items-center rounded-full bg-brand px-5 text-sm font-bold text-white hover:bg-brand-strong"
            >
              View all wholesale
            </Link>
          </div>
        )}

        {results.totalPages > 1 && (
          <nav
            aria-label="Wholesale result pages"
            className="mt-8 flex items-center justify-center gap-3"
          >
            {results.page > 1 ? (
              <Link
                href={browseHref({
                  category: selectedCategory,
                  search: selectedSearch,
                  sort: selectedSort,
                  page: results.page - 1,
                })}
                className="inline-flex h-10 items-center gap-1 rounded-full border border-slate-300 bg-white px-4 text-sm font-bold hover:border-brand hover:text-brand-strong dark:border-slate-700 dark:bg-slate-900"
              >
                <ChevronLeft size={16} /> Previous
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-slate-500">
              Page {results.page} of {results.totalPages}
            </span>
            {results.page < results.totalPages ? (
              <Link
                href={browseHref({
                  category: selectedCategory,
                  search: selectedSearch,
                  sort: selectedSort,
                  page: results.page + 1,
                })}
                className="inline-flex h-10 items-center gap-1 rounded-full border border-slate-300 bg-white px-4 text-sm font-bold hover:border-brand hover:text-brand-strong dark:border-slate-700 dark:bg-slate-900"
              >
                Next <ChevronRight size={16} />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import type { HomepageDTO } from "@nuru/types";
import type { Route } from "next";
import { formatPrice } from "@/lib/formatPrice";

function configuration(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export default function HomepageSections({ homepage }: { homepage: HomepageDTO }) {
  if (!homepage.sections.length) return null;

  return (
    <div className="space-y-8 bg-slate-50 py-6 dark:bg-black">
      {homepage.sections.map((section) => {
        const config = configuration(section.configuration);
        const grid = config.layout === "grid";
        const collection = section.collection;
        return (
          <section
            key={section.id}
            aria-labelledby={`collection-${collection.id}`}
            data-collection-id={collection.id}
            data-collection-key={collection.key}
            className="mx-auto max-w-7xl px-2 sm:px-6"
          >
            <header className="mb-3 flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id={`collection-${collection.id}`} className="text-xl font-bold text-slate-950 sm:text-2xl dark:text-white">
                    {collection.displayName}
                  </h2>
                  {collection.badgeText && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      {collection.badgeText}
                    </span>
                  )}
                </div>
                {collection.description && <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{collection.description}</p>}
              </div>
              <Link
                href={(collection.ctaUrl || `/collections/${encodeURIComponent(collection.key)}`) as Route}
                className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-400"
              >
                {collection.ctaText || "View all"} <ArrowRight size={15} />
              </Link>
            </header>

            <div className={grid
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
              : "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 sm:gap-4"
            }>
              {section.products.map((product) => {
                const effective = Number(product.effectivePrice);
                const base = Number(product.basePrice);
                const discounted = Number.isFinite(base) && effective < base;
                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.slug ?? product.id}`}
                    className={`${grid ? "min-w-0" : "w-40 min-w-40 sm:w-52 sm:min-w-52"} group snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900`}
                  >
                    <div className="relative aspect-square bg-white dark:bg-slate-950">
                      <Image
                        src={product.images[0] || "/assets/logo.png"}
                        alt={product.name}
                        fill
                        className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 210px"
                      />
                      {discounted && (
                        <span className="absolute right-2 top-2 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-bold text-white">
                          {Math.round((1 - effective / base) * 100)}% OFF
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-900 dark:text-slate-100">{product.name}</h3>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <div>
                          {discounted && <p className="text-xs text-slate-400 line-through">{formatPrice(base)}</p>}
                          <p className="font-bold text-blue-700 dark:text-blue-400">{formatPrice(effective)}</p>
                        </div>
                        {product.promotionEndsAt && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-600" title={`Ends ${product.promotionEndsAt}`}>
                            <Clock3 size={12} /> Limited
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

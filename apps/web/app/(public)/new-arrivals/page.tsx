import Image from "next/image";
import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
import { formatPrice } from "@/lib/formatPrice";
import { getDiscountPercent, getOriginalPrice, getSellingPrice } from "@/lib/pricing";
import { listProducts } from "@/lib/data/catalog";

export const metadata = {
  title: "New Arrivals – NuruShop",
  description: "The latest products added to NuruShop.",
};

export default async function NewArrivalsPage() {
  // One cached call; split client-side into fresh arrivals vs. suggestions.
  const { items } = await listProducts({ pageSize: 60, sort: "newest" });

  const arrivals = items.filter((p) => p.isNew);
  const arrivalIds = new Set(arrivals.map((p) => p.id));
  const suggestedProducts = items.filter((p) => !arrivalIds.has(p.id)).slice(0, 18);

  const showingArrivals = arrivals.length > 0;
  const visibleProducts = showingArrivals ? arrivals : suggestedProducts;

  return (
    <main className="min-h-screen py-14 sm:py-12">
      <div className="max-w-7xl mx-auto px-0 sm:px-2">
        <div className="mb-3">
          <SectionHeader
            title={showingArrivals ? "New Arrivals" : "You May Also Like"}
            showViewAll={false}
          />
        </div>

        {!showingArrivals && visibleProducts.length > 0 && (
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200">
            No active new arrivals right now. Here are other products you can explore.
          </div>
        )}

        {visibleProducts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center text-slate-500 dark:text-slate-400">
            No products available right now.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
            {visibleProducts.map((product) => {
              const discountPercent = getDiscountPercent(product);
              const originalPrice = getOriginalPrice(product);
              const sellingPrice = getSellingPrice(product);

              return (
                <Link
                  key={product.id}
                  href={product.href}
                  className="group relative block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 overflow-hidden"
                >
                  {discountPercent && (
                    <div className="absolute top-1 right-1 z-10 bg-red-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      {discountPercent}% OFF
                    </div>
                  )}
                  {showingArrivals && (
                    <div className="absolute top-1 left-1 z-10 bg-green-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      NEW
                    </div>
                  )}

                  <div className="relative aspect-square bg-white dark:bg-gray-800">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-contain p-1"
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
                    />
                  </div>

                  <div className="p-1.5">
                    <h3 className="text-[11px] sm:text-xs font-semibold line-clamp-2 leading-tight text-slate-800 dark:text-slate-100">
                      {product.name}
                    </h3>
                    <div className="mt-1">
                      {discountPercent && originalPrice && (
                        <p className="text-[10px] text-slate-400 line-through leading-none">
                          {formatPrice(originalPrice)}
                        </p>
                      )}
                      <p className="text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 leading-none">
                        {formatPrice(sellingPrice)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/formatPrice";
import { formatCategoryLabel } from "@/lib/categoryUtils";
import { getDiscountPercent, getOriginalPrice, getSellingPrice } from "@/lib/pricing";
import SectionHeader from "@/components/ui/SectionHeader";
import { listProducts } from "@/lib/data/catalog";
import { listWholesaleItems } from "@/lib/data/wholesale";
import type { ProductCardVM } from "@/lib/view/catalog";

export const metadata = {
  title: "Shop – NuruShop",
  description: "Browse retail and wholesale products at NuruShop.",
};

function ProductCard({
  product,
  showCategory,
}: {
  product: ProductCardVM;
  showCategory: boolean;
}) {
  const discountPercent = getDiscountPercent(product);
  const originalPrice = getOriginalPrice(product);
  const sellingPrice = getSellingPrice(product);

  return (
    <Link
      href={product.href}
      className="group bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm dark:shadow-gray-900 hover:shadow-lg dark:hover:shadow-gray-700 transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 flex flex-col h-full"
    >
      <div className="relative w-full pt-[100%] overflow-hidden bg-gray-100 dark:bg-gray-700">
        <div className="absolute inset-0">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          />
        </div>
        {showCategory && product.categoryName && (
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
            <span className="px-2 py-1 sm:px-3 sm:py-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-xs font-semibold text-gray-800 dark:text-gray-200 rounded-full truncate max-w-[100px]">
              {product.categoryName}
            </span>
          </div>
        )}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col items-end gap-2">
          {discountPercent && (
            <span className="px-2 py-1 sm:px-3 sm:py-1 bg-red-600 text-white text-xs font-semibold rounded-full">
              {discountPercent}% OFF
            </span>
          )}
          {product.isNew && (
            <span className="px-2 py-1 sm:px-3 sm:py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
              NEW
            </span>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base md:text-lg mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors min-h-[2.5em]">
          {product.name}
        </h3>
        <div className="mt-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-col">
              {discountPercent && originalPrice && (
                <span className="text-xs text-gray-400 line-through">
                  {formatPrice(originalPrice)}
                </span>
              )}
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatPrice(sellingPrice)}
              </span>
            </div>
            <span className="sm:hidden text-xs text-gray-500 dark:text-gray-400 text-right">
              Tap to view →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  const selectedCategory = resolved?.category
    ? decodeURIComponent(String(resolved.category)).toLowerCase().trim()
    : "";

  let allProducts: ProductCardVM[] = [];
  let wholesaleProducts = [] as Awaited<ReturnType<typeof listWholesaleItems>>["items"];

  try {
    const [productsResult, wholesaleResult] = await Promise.all([
      listProducts({ pageSize: 100, sort: "newest" }),
      listWholesaleItems({ pageSize: 24, sort: "newest" }),
    ]);
    allProducts = productsResult.items;
    wholesaleProducts = wholesaleResult.items;
  } catch (error) {
    console.error("Error loading products:", error);
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Error Loading Products
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Please try again later.</p>
        </div>
      </div>
    );
  }

  const products = selectedCategory
    ? allProducts.filter((p) => p.categorySlug === selectedCategory)
    : allProducts;

  const suggestions = selectedCategory
    ? allProducts.filter((p) => p.categorySlug !== selectedCategory).slice(0, 8)
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-2 sm:px-4 py-8 md:py-12">
        {selectedCategory && (
          <div className="mb-6 mx-2 sm:mx-0 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 text-blue-700 px-4 py-3">
            <span className="text-sm font-medium">
              Showing category: {formatCategoryLabel(selectedCategory)}
            </span>
            <Link href="/shop" className="text-sm font-semibold hover:underline">
              Clear
            </Link>
          </div>
        )}

        {wholesaleProducts.length > 0 && (
          <section className="mb-10 mx-2 sm:mx-0">
            <div className="mb-3">
              <SectionHeader title="Wholesale Deals" href="/wholeseller" showViewAll={false} />
            </div>

            <div className="grid grid-flow-col auto-cols-[minmax(160px,1fr)] sm:auto-cols-[minmax(200px,1fr)] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {wholesaleProducts.map((product) => (
                <Link
                  key={product.id}
                  href={product.href}
                  className="group bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm dark:shadow-gray-900 hover:shadow-lg dark:hover:shadow-gray-700 transition-all duration-300 overflow-hidden border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 flex flex-col h-full snap-start"
                >
                  <div className="relative w-full pt-[100%] overflow-hidden bg-blue-50 dark:bg-blue-950/30">
                    <div className="absolute inset-0">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                      />
                    </div>
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase rounded-full">
                        Wholesale
                      </span>
                    </div>
                  </div>

                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Min: {product.minQuantity} unit
                    </p>
                    <div className="mt-auto pt-2">
                      <div className="text-blue-600 dark:text-blue-400 font-bold text-base">
                        {formatPrice(product.unitPrice)}
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {" "}
                          / unit
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mb-3 mx-2 sm:mx-0">
          <SectionHeader
            title={
              selectedCategory
                ? `${formatCategoryLabel(selectedCategory)} Retail`
                : "Retail Products"
            }
            href="/shop"
            showViewAll={false}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} showCategory={!selectedCategory} />
          ))}
        </div>

        {selectedCategory && suggestions.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              You may also like
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {suggestions.map((product) => (
                <ProductCard key={product.id} product={product} showCategory />
              ))}
            </div>
          </div>
        )}

        {products.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-4xl">📦</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No Products Available
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Our store is currently being stocked. Check back soon for amazing products!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

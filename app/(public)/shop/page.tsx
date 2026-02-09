import { Timestamp } from "firebase/firestore";
import { getAllProducts } from "@/lib/firestoreHelpers";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/formatPrice";
import { formatCategoryLabel } from "@/lib/categoryUtils";

export const dynamic = "force-dynamic";

// Type for raw Firestore product
interface RawProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  images?: string[];
  category?: string;
  slug?: string;
  createdAt?: Timestamp | string | null;
}

// Canonical Product type without description
interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  images?: string[];
  category: string;
  slug?: string;
  createdAt?: number | string | null;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  let products: Product[] = [];
  const selectedCategory = searchParams?.category
    ? decodeURIComponent(String(searchParams.category)).toLowerCase().trim()
    : "";
  
  try {
    const rawProducts = await getAllProducts();

    if (!rawProducts || rawProducts.length === 0) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="container mx-auto px-4 py-20">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">No Products Found</h1>
              <p className="text-gray-600 dark:text-gray-400">Check back soon for new arrivals!</p>
            </div>
          </div>
        </div>
      );
    }

    // Map Firestore data to Product type
    products = rawProducts
      .map((p: RawProduct) => {
        let createdAt: number | string | null = null;

        if (p.createdAt) {
          if (p.createdAt instanceof Timestamp) {
            createdAt = p.createdAt.toMillis();
          } else if (
            typeof p.createdAt === "object" &&
            "seconds" in p.createdAt &&
            "nanoseconds" in p.createdAt
          ) {
            createdAt =
              (p.createdAt as Timestamp).seconds * 1000 +
              (p.createdAt as Timestamp).nanoseconds / 1_000_000;
          } else if (typeof p.createdAt === "string") {
            createdAt = p.createdAt;
          }
        }

        return {
          id: p.id,
          name: p.name,
          price: p.price,
          imageUrl: p.image || "/images/placeholder.png",
          images: p.images || (p.image ? [p.image] : []),
          category: p.category || "Uncategorized",
          slug: p.slug,
          createdAt,
        };
      })
      // Sort products by createdAt (newest first)
      .sort((a, b) => {
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
        return timeB - timeA; // Descending order (newest first)
      });

    if (selectedCategory) {
      products = products.filter(
        (p) => (p.category || "").toLowerCase() === selectedCategory
      );
    }

  } catch (error) {
    console.error("Error loading products:", error);
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error Loading Products</h1>
            <p className="text-gray-600 dark:text-gray-400">Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      

      {/* Products Grid */}
      <div className="container mx-auto px-2 sm:px-4 py-8 md:py-12">
        {/* Stats Bar */}
        <div className="mb-8 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900 border border-gray-200 dark:border-gray-700 mx-2 sm:mx-0">
        
        </div>

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

        {/* Products Grid - 2 columns on mobile, 3 on tablet, 4 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {products.map((product) => {
            const mainImage = product.images?.[0] || product.imageUrl || "/images/placeholder.png";
            
            return (
              <Link
                key={product.id}
                href={`/products/${product.slug || product.id}`}
                className="group bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm dark:shadow-gray-900 hover:shadow-lg dark:hover:shadow-gray-700 transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 flex flex-col h-full"
              >
                {/* Image Container - Maintain aspect ratio, no cropping */}
                <div className="relative w-full pt-[100%] overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <div className="absolute inset-0">
                    <Image
                      src={mainImage}
                      alt={product.name}
                      fill
                      className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                      priority={false}
                    />
                  </div>
                  {/* Category Badge */}
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                    <span className="px-2 py-1 sm:px-3 sm:py-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-xs font-semibold text-gray-800 dark:text-gray-200 rounded-full truncate max-w-[100px]">
                      {product.category}
                    </span>
                  </div>
                  {/* New Badge for recent products */}
                  {product.createdAt && 
                    typeof product.createdAt === 'number' && 
                    Date.now() - product.createdAt < 7 * 24 * 60 * 60 * 1000 && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                      <span className="px-2 py-1 sm:px-3 sm:py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                        NEW
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base md:text-lg mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors min-h-[2.5em]">
                    {product.name}
                  </h3>
                  
                  {/* Price Section */}
                  <div className="mt-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatPrice(product.price)}
                      </span>
                      {/* View Button - Hidden on mobile, shown on hover for larger screens */}
                      <button className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity duration-300 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 dark:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 whitespace-nowrap">
                        View Details
                      </button>
                      {/* Mobile view indicator */}
                      <span className="sm:hidden text-xs text-gray-500 dark:text-gray-400 text-right">Tap to view →</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Empty State */}
        {products.length === 0 && (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-4xl">📦</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Products Available</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Our store is currently being stocked. Check back soon for amazing products!
            </p>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 mx-auto md:mx-0 mb-3 md:mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <span className="text-xl md:text-2xl">🚚</span>
              </div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 md:mb-2 text-sm md:text-base">Fast Shipping</h4>
              <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Free shipping on orders over $50</p>
            </div>
            <div className="text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 mx-auto md:mx-0 mb-3 md:mb-4 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <span className="text-xl md:text-2xl">🛡️</span>
              </div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 md:mb-2 text-sm md:text-base">Secure Payment</h4>
              <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">100% secure & encrypted payments</p>
            </div>
            <div className="text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 mx-auto md:mx-0 mb-3 md:mb-4 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <span className="text-xl md:text-2xl">💚</span>
              </div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1 md:mb-2 text-sm md:text-base">Quality Guaranteed</h4>
              <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Premium products with satisfaction guarantee</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

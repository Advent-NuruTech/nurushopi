import ShareableProductGrid from "@/components/ui/ShareableProductGrid";
import HeroSection from "@/components/ui/HeroSection";
import { listProducts } from "@/lib/data/catalog";
import type { Product } from "@/lib/types";

export const metadata = {
  title: "Share Our Products – NuruShop",
  description: "Help spread the word! Share NuruShop products with friends and family.",
};

export default async function SharePage() {
  const { items } = await listProducts({ pageSize: 60, sort: "newest" });

  // Map render-ready card view models to the shape the shareable grid expects.
  const products: Product[] = items.map((p) => ({
    id: p.id,
    name: p.name,
    shortDescription: p.shortDescription ?? "A quality product from NuruShop.",
    price: p.sellingPrice,
    sellingPrice: p.sellingPrice,
    originalPrice: p.originalPrice,
    images: p.images,
    category: p.categorySlug ?? "",
    slug: p.slug,
    createdAt: p.createdAtMs,
  }));

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <HeroSection />
      {products.length === 0 ? (
        <div className="flex justify-center items-center h-[40vh] text-gray-500 dark:text-gray-400">
          No products available to share yet.
        </div>
      ) : (
        <ShareableProductGrid
          products={products}
          title="Share Our Products"
          subtitle="Help spread the word! Share these products with your friends and family."
        />
      )}
    </main>
  );
}

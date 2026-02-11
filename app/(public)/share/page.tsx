import { getAllProducts } from "@/lib/firestoreHelpers";
import ShareableProductGrid from "@/components/ui/ShareableProductGrid";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import HeroSection from "@/components/ui/HeroSection";
import { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  const products: Product[] = await getAllProducts();

  if (!products || products.length === 0) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <LoadingSpinner text="Loading Products..." />
      </div>
    );
  }

  const uiProducts = products.map((p) => {
    return {
      ...p,
      // Use optional chaining for safer access to potentially undefined properties.
      image: p.images?.[0] || "/assets/logo.jpg",
      shortDescription:
        p.shortDescription ||
        p.description ||
        "A quality product from NuruShop.",
    };
  });

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <HeroSection />
      <ShareableProductGrid
        products={uiProducts}
        title="Share Our Products"
        subtitle="Help spread the word! Share these products with your friends and family."
      />
    </main>
  );
}

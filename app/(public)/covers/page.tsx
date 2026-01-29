// nurushop/app/covers/page.tsx
import { getProductsByCategory } from "@/lib/firestoreHelpers";
import ProductGrid from "@/components/ui/ProductGrid";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export const dynamic = "force-dynamic";

export default async function CoversPage() {
  const products = await getProductsByCategory("covers");

  if (!products) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <LoadingSpinner text="Loading Covers..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <ProductGrid
        products={products}
        title="Covers & Accessories"
        subtitle="Protective covers and practical accessories for your Bibles and books."
      />
    </main>
  );
}

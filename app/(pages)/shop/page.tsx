// app/(pages)/shop/page.tsx
import { getAllProducts } from "@/lib/firestoreHelpers";
import ProductGrid from "@/components/ui/ProductGrid";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await getAllProducts();

  if (!products) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <LoadingSpinner text="Loading All Products..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <ProductGrid
        products={products}
        title="Explore Our Full Collection"
        subtitle="Browse all available products in our store. Find everything you need in one place."
      />
    </main>
  );
}



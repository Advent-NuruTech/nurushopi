// nurushop/app/pioneers/page.tsx
import { getProductsByCategory } from "@/lib/firestoreHelpers";
import ProductGrid from "@/components/ui/ProductGrid";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { Product } from "@/components/ui/product";
export const dynamic = "force-dynamic";

export default async function PioneersPage() {
  const products = await getProductsByCategory("pioneers");

  if (!products) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <LoadingSpinner text="Loading Pioneer Writings..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <ProductGrid
        products={products}
        title="Pioneer Writings"
        subtitle="Inspired writings and historical works by early Adventist pioneers who helped shape our faith."
      />
    </main>
  );
}

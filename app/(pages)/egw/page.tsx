// app/(pages)/egw/page.tsx
import { getProductsByCategory } from "@/lib/firestoreHelpers";
import ProductGrid from "@/components/ui/ProductGrid";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ProductCard from "@/components/ui/ProductCard";

export const dynamic = "force-dynamic";

export default async function EGWPage() {
  const products = await getProductsByCategory("EGW");

  if (!products) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <LoadingSpinner text="Loading EGW Books..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <ProductGrid products={products} title="Ellen G. White Books & Writings" />
    </main>
  );
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 p-3 sm:p-6">
  {products.map((product) => (
    <ProductCard key={product.id} product={product} />
  ))}
</div>

}

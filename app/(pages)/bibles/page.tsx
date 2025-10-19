// nurushop/app/bibles/page.tsx
import { getProductsByCategory } from "@/lib/firestoreHelpers";
import ProductGrid from "@/components/ui/ProductGrid";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export const dynamic = "force-dynamic";

export default async function BiblesPage() {
  const products = await getProductsByCategory("bibles");

  if (!products) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <LoadingSpinner text="Loading Bibles..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <ProductGrid 
        products={products} 
        title="Holy Bibles — Various Translations & Covers" 
        subtitle="Discover Bibles in different versions, sizes, and elegant covers for personal study or gifting." 
      />
    </main>
  );
}

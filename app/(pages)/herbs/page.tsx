// nurushop/app/songbooks/page.tsx → can be renamed to /remedies/page.tsx if you want
import { getProductsByCategory } from "@/lib/firestoreHelpers";
import ProductGrid from "@/components/ui/ProductGrid";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export const dynamic = "force-dynamic";

export default async function RemediesPage() {
  const products = await getProductsByCategory("herbs"); // fetch remedies category

  if (!products) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <LoadingSpinner text="Loading Remedies..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <ProductGrid
        products={products}
        title="All Remedies"
        subtitle="Browse our collection of health remedies, natural products, and wellness items."
      />
    </main>
  );
}

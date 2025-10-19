// nurushop/app/authors/page.tsx
import { getProductsByCategory } from "@/lib/firestoreHelpers";
import ProductGrid from "@/components/ui/ProductGrid";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export const dynamic = "force-dynamic";

export default async function AuthorsPage() {
  const products = await getProductsByCategory("authors");

  if (!products) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <LoadingSpinner text="Loading Other Authors..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <ProductGrid
        products={products}
        title="Books by Other Authors"
        subtitle="Explore writings from various authors promoting truth, reform, and natural living."
      />
    </main>
  );
}

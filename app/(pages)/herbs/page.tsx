// nurushop/app/songbooks/page.tsx
import { getProductsByCategory } from "@/lib/firestoreHelpers";
import ProductGrid from "@/components/ui/ProductGrid";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export const dynamic = "force-dynamic";

export default async function SongbooksPage() {
  const products = await getProductsByCategory("songbooks");

  if (!products) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <LoadingSpinner text="Loading Song Books..." />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <ProductGrid
        products={products}
        title="Song Books & Hymnals"
        subtitle="Collections of hymns and songbooks for church and personal worship."
      />
    </main>
  );
}

// app/(pages)/shop/page.tsx
import { getAllProducts } from "@/lib/firestoreHelpers";
import ProductGrid from "@/components/ui/ProductGrid";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const rawProducts = await getAllProducts();

  if (!rawProducts) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <LoadingSpinner text="Loading All Products..." />
      </div>
    );
  }

  const products = rawProducts.map((p: any) => {
    let createdAt = null;

    if (p.createdAt) {
      if (typeof p.createdAt.toMillis === "function") {
        createdAt = p.createdAt.toMillis();
      } else if (
        typeof p.createdAt.seconds === "number" &&
        typeof p.createdAt.nanoseconds === "number"
      ) {
        createdAt =
          p.createdAt.seconds * 1000 + p.createdAt.nanoseconds / 1_000_000;
      } else if (typeof p.createdAt === "string") {
        createdAt = p.createdAt;
      }
    }

    return {
      ...p,
      createdAt,
    };
  });

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

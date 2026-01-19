import { Product } from "@/lib/types"; // canonical Product type
import { getAllProducts } from "@/lib/firestoreHelpers";
import ProductGrid from "@/components/ui/ProductGrid";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Timestamp } from "firebase/firestore";

export const dynamic = "force-dynamic";

// Type for raw Firestore product (matches Firestore fields)
interface RawProduct {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  images?: string[];
  category?: string;
  slug?: string;
  createdAt?: Timestamp | string | null;
}

export default async function ShopPage() {
  const rawProducts = await getAllProducts();

  if (!rawProducts || rawProducts.length === 0) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <LoadingSpinner text="Loading All Products..." />
      </div>
    );
  }

  // Map Firestore data to canonical Product type
  const products: Product[] = rawProducts.map((p: RawProduct) => {
    let createdAt: number | string | null = null;

    if (p.createdAt) {
      if (p.createdAt instanceof Timestamp) {
        createdAt = p.createdAt.toMillis();
      } else if (
        typeof p.createdAt === "object" &&
        "seconds" in p.createdAt &&
        "nanoseconds" in p.createdAt
      ) {
        createdAt =
          (p.createdAt as Timestamp).seconds * 1000 +
          (p.createdAt as Timestamp).nanoseconds / 1_000_000;
      } else if (typeof p.createdAt === "string") {
        createdAt = p.createdAt;
      }
    }

    return {
      id: p.id,
      name: p.name,
      price: p.price,
      description:
        p.description && p.description !== "undefined"
          ? p.description
          : "No description available",
      imageUrl: p.image || "",
      images: p.images || (p.image ? [p.image] : []),
      category: p.category || "Uncategorized",
      slug: p.slug,
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

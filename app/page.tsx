import HeroSection from "@/components/ui/HeroSection";
import FeaturedSection from "@/components/ui/FeaturedSection";
import FeaturedHero from "@/components/ui/FeaturedHero";
import { getAllProducts } from "@/lib/firestoreHelpers";
import { Product } from "@/lib/types";

// ✅ Helper to safely convert Firestore timestamps to plain values
function serializeFirestoreDoc(doc: any) {
  return JSON.parse(
    JSON.stringify(doc, (key, value) => {
      // Convert Firestore Timestamp to ISO string
      if (value && typeof value === "object" && value.seconds) {
        return new Date(value.seconds * 1000).toISOString();
      }
      return value;
    })
  );
}

export default async function HomePage() {
  const products: Product[] = await getAllProducts();

  // ✅ Prepare UI-safe (serializable) products
  const uiProducts = products.map((p) =>
    serializeFirestoreDoc({
      ...p,
      image: p.images?.[0] || "/images/placeholder.png",
      shortDescription:
        p.shortDescription ||
        p.description ||
        "A quality product from NuruShop.",
    })
  );

  return (
    <main>
      <HeroSection />
      <FeaturedHero products={uiProducts} />
      <FeaturedSection products={uiProducts} />
    </main>
  );
}

import HeroSection from "@/components/ui/HeroSection";
import FeaturedSection from "@/components/ui/FeaturedSection";
import FeaturedHero from "@/components/ui/FeaturedHero";
import Banners from "@/components/ui/Banners";
import { getAllProducts } from "@/lib/firestoreHelpers";
import { Product } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

// 🔹 Type-safe helper to convert Firestore Timestamps to ISO strings
function serializeFirestoreDoc<T extends Record<string, unknown>>(doc: T): T {
  return JSON.parse(
    JSON.stringify(doc, (key, value) => {
      if (value instanceof Timestamp) {
        return value.toDate().toISOString();
      }
      return value;
    })
  );
}

export default async function HomePage() {
  const products: Product[] = await getAllProducts();

  // 🔹 Map Firestore products to UI-safe format compatible with Featured components
  const uiProducts: (Product & { image: string; shortDescription: string })[] = products.map(
    (p) =>
      serializeFirestoreDoc({
        ...p,
        // Use first image if exists, otherwise fallback to a default avatar
        image: p.images?.[0] || "/images/avatar.png",
        shortDescription: p.shortDescription || p.description || "A quality product from NuruShop.",
      })
  );

  return (
    <main>
      <HeroSection />

      <FeaturedHero products={uiProducts} />

      <Banners />

      <FeaturedSection products={uiProducts} />
    </main>
  );
}

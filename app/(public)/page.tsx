// ./app/(public)/page.tsx
import HeroSection from "@/components/ui/HeroSection";
import FeaturedSection from "@/components/ui/FeaturedSection";
import FeaturedHero from "@/components/ui/FeaturedHero";
import NewArrivals from "@/components/ui/NewArrivals";
import Bannerss from "@/components/ui/Bannerss";
import { getAllProducts, getAllCategories } from "@/lib/firestoreHelpers";
import { Product } from "@/lib/types";
import { Timestamp } from "firebase/firestore";
import SectionHeader from "@/components/ui/SectionHeader";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

export const dynamic = "force-dynamic";

/* ---------- Helpers ---------- */

function serializeFirestoreDoc<T extends Record<string, unknown>>(doc: T): T {
  return JSON.parse(
    JSON.stringify(doc, (_key, value) => {
      if (value instanceof Timestamp) {
        return value.toDate().toISOString();
      }
      return value;
    })
  );
}

/* ---------- Extended product shape used in UI ---------- */

type ProductWithExtras = Product & {
  mode?: string;
  images?: string[];
  shortDescription?: string;
  description?: string;
};

/* ---------- Page ---------- */

export default async function HomePage() {
  const [productsRaw, categories, wholesaleSnap] = await Promise.all([
    getAllProducts(),
    getAllCategories(),
    getDocs(
      query(
        collection(db, "products"),
        where("mode", "==", "wholesale"),
        orderBy("createdAt", "desc"),
        limit(12)
      )
    ),
  ]);

  const products = productsRaw as ProductWithExtras[];

  // Exclude wholesale products
  const retailProducts = products.filter(
    (p) => (p.mode ?? "") !== "wholesale"
  );

  // Convert products for UI components
  const uiProducts: (Product & {
    image: string;
    shortDescription: string;
  })[] = retailProducts.map((p) =>
    serializeFirestoreDoc({
      ...p,
      image: p.images?.[0] || "/assets/logo.jpg",
      shortDescription:
        p.shortDescription ||
        p.description ||
        "A quality product from NuruShop.",
    })
  );

  const wholesaleProducts = wholesaleSnap.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;

    return {
      id: docSnap.id,
      name: String(data.name ?? "Wholesale product"),
      wholesalePrice: Number(data.wholesalePrice ?? data.price ?? 0),
      wholesaleMinQty: Number(data.wholesaleMinQty ?? 1),
      wholesaleUnit: String(data.wholesaleUnit ?? "unit"),
      imageUrl:
        (Array.isArray(data.images) && String(data.images[0])) ||
        (typeof data.coverImage === "string"
          ? data.coverImage
          : "/assets/logo.jpg"),
    };
  });

  return (
    <main>
      <HeroSection />
      <NewArrivals />

      <FeaturedHero
        products={uiProducts}
        categories={categories.map((c) => ({
          name: c.name,
          slug: c.slug,
        }))}
      />

      {wholesaleProducts.length > 0 && (
        <section className="py-6 bg-white dark:bg-black">
          <div className="max-w-7xl mx-auto px-2 sm:px-6">
            <div className="mb-3">
              <SectionHeader
                title="Wholesale Picks"
                href="/wholeseller"
              />
            </div>

            <div className="grid grid-flow-col auto-cols-[minmax(160px,1fr)] sm:auto-cols-[minmax(200px,1fr)] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {wholesaleProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/wholeseller/${product.id}`}
                  className="group bg-white dark:bg-gray-900 rounded-xl border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-sm hover:shadow-md transition snap-start"
                >
                  <div className="relative w-full pt-[100%] overflow-hidden bg-blue-50 dark:bg-blue-950/30 rounded-t-xl">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    />

                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase rounded-full">
                        Wholesale
                      </span>
                    </div>
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm line-clamp-2">
                      {product.name}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Min: {product.wholesaleMinQty}{" "}
                      {product.wholesaleUnit}
                    </p>

                    <p className="text-blue-600 dark:text-blue-400 font-bold text-base mt-2">
                      KSh {product.wholesalePrice.toLocaleString()} /{" "}
                      {product.wholesaleUnit}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Bannerss />

      <FeaturedSection
        products={uiProducts}
        categories={categories.map((c) => ({
          name: c.name,
          slug: c.slug,
        }))}
      />
    </main>
  );
}

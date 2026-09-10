// ./app/(public)/page.tsx
import type { Route } from "next";
import HeroSection from "@/components/ui/HeroSection";
import FeaturedSection from "@/components/ui/FeaturedSection";
import SabbathExperience from "@/components/ui/SabbathExperience";
import { listProducts, listCategories } from "@/lib/data/catalog";
import { listWholesaleItems } from "@/lib/data/wholesale";
import { getHomepageMerchandising } from "@/lib/data/merchandising";
import type { ProductCardVM } from "@/lib/view/catalog";

// Storefront is served from the Data Cache (ISR). The data-layer functions set
// per-collection `revalidate` windows and cache tags; admin writes purge them
// instantly via POST /api/revalidate. No `force-dynamic` needed.

/** Adapt a card VM to the shape the Featured* carousels expect. */
function toFeaturedProduct(p: ProductCardVM) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brandName: p.brandName,
    storeName: p.storeName,
    ratingSummary: p.ratingSummary,
    image: p.image,
    category: p.categorySlug ?? "",
    price: p.price,
    originalPrice: p.originalPrice,
    sellingPrice: p.sellingPrice,
    shortDescription: p.shortDescription ?? undefined,
    inStock: p.inStock,
    stock: p.stock,
    stockStatus: p.stockStatus,
    createdAt: p.createdAtMs,
    isNew: p.isNew,
  };
}

export default async function HomePage() {
  const [productsResult, categories, wholesaleResult, homepage] = await Promise.all([
    listProducts({ pageSize: 60, sort: "newest" }),
    listCategories(),
    listWholesaleItems({ pageSize: 12, sort: "newest" }),
    getHomepageMerchandising(),
  ]);

  const featuredProducts = productsResult.items.map(toFeaturedProduct);
  const categoryOptions = categories.map((category) => ({
    name: category.name,
    slug: category.slug,
    image: category.image,
  }));
  const wholesaleProducts = wholesaleResult.items;
  const merchandisingCards = homepage.sections.map((section) => ({
    id: section.id,
    title: section.collection.displayName,
    description: section.collection.description,
    image: section.collection.imageUrl || section.products[0]?.images[0] || null,
    badge: section.collection.badgeText,
    cta: section.collection.ctaText,
    href: (section.collection.ctaUrl ||
      `/collections/${encodeURIComponent(section.collection.key)}`) as Route,
    promotionEndsAt:
      section.products
        .flatMap((product) => (product.promotionEndsAt ? [product.promotionEndsAt] : []))
        .sort()[0] ?? null,
    generatedAt: homepage.generatedAt,
  }));

  return (
    <main className="bg-slate-50 dark:bg-black">
      <HeroSection />

      <SabbathExperience />
      <FeaturedSection
        products={featuredProducts}
        categories={categoryOptions}
        wholesale={wholesaleProducts}
        merchandising={merchandisingCards}
      />
    </main>
  );
}

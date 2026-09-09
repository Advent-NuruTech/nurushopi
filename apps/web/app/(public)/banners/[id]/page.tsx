import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FeaturedSection from "@/components/ui/FeaturedSection";
import ShareButton from "@/components/ui/ShareButton";
import { getBanner, listProducts } from "@/lib/data/catalog";
import { shareDescription } from "@/lib/share";

function formatText(text: string): string {
  if (!text) return "";
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<u>$1</u>");
  return formatted
    .split(/\n{2,}/)
    .map((p) => `<p class="mb-4">${p.trim()}</p>`)
    .join("");
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const banner = await getBanner(id);
  if (!banner) return { title: "Offer not found – NuruShop" };

  const title = banner.title || "NuruShop offer";
  const description = shareDescription(banner.subtitle, "Discover this special offer at NuruShop.");
  const images = banner.image ? [{ url: banner.image, alt: title }] : undefined;

  return {
    title: `${title} – NuruShop`,
    description,
    alternates: { canonical: banner.href },
    openGraph: { title, description, url: banner.href, type: "website", images },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: banner.image ? [banner.image] : undefined,
    },
  };
}

export default async function BannerDetails({ params }: PageProps) {
  const { id } = await params;
  const [banner, productsResult] = await Promise.all([
    getBanner(id),
    listProducts({ pageSize: 8, sort: "newest" }),
  ]);
  if (!banner) notFound();

  const recommendations = productsResult.items.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    brandName: product.brandName,
    storeName: product.storeName,
    image: product.image,
    category: product.categorySlug ?? "",
    price: product.price,
    originalPrice: product.originalPrice,
    sellingPrice: product.sellingPrice,
    shortDescription: product.shortDescription ?? undefined,
    inStock: product.inStock,
    stock: product.stock,
    stockStatus: product.stockStatus,
    ratingSummary: product.ratingSummary,
    createdAt: product.createdAtMs,
    isNew: product.isNew,
  }));

  return (
    <main className="min-h-screen bg-slate-50 py-8 dark:bg-black sm:py-12">
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid lg:grid-cols-2">
            <div className="relative aspect-[16/10] bg-[#EFFCF3] dark:bg-[#063D1E] lg:aspect-auto lg:min-h-[400px]">
              {banner.image ? (
                <Image
                  src={banner.image}
                  alt={banner.title}
                  fill
                  className="object-contain p-4 sm:p-8"
                  sizes="(max-width: 1023px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="grid h-full place-items-center p-8 text-sm font-medium text-[#006B2C] dark:text-[#B8F5C8]">
                  NuruShop offer
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-10">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#006B2C] dark:text-[#00C83A]">
                Special offer
              </p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  {banner.title}
                </h1>
                <ShareButton
                  title={banner.title || "NuruShop offer"}
                  description={banner.subtitle}
                  href={banner.href}
                />
              </div>
              {banner.subtitle && (
                <div
                  className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: formatText(banner.subtitle) }}
                />
              )}

              {banner.linkUrl && (
                <a
                  href={banner.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex w-fit items-center rounded-xl bg-[#009933] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#006B2C]"
                >
                  Shop this offer
                </a>
              )}
            </div>
          </div>
        </div>

        {recommendations.length > 0 && (
          <div className="mt-10 sm:mt-14">
            <FeaturedSection
              title="You may also like"
              products={recommendations}
              preserveProductOrder
              enableFeedModules={false}
            />
          </div>
        )}
      </section>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import SectionHeader from "@/components/ui/SectionHeader";
import { listBanners } from "@/lib/data/catalog";

export const metadata = {
  title: "Promotions & Offers – NuruShop",
  description: "Current promotions and special offers at NuruShop.",
};

export default async function BannersPage() {
  const banners = await listBanners();

  return (
    <main className="min-h-screen py-16 sm:py-14">
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <div className="mb-4">
          <SectionHeader title="Promotions & Offers" showViewAll={false} />
        </div>

        {banners.length === 0 ? (
          <p className="text-sm text-slate-500">No active promotions right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {banners.map((banner) => (
              <Link
                key={banner.id}
                href={banner.href}
                className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-md transition"
              >
                <div className="relative w-full aspect-[16/10] bg-slate-100 dark:bg-slate-800">
                  {banner.image ? (
                    <Image
                      src={banner.image}
                      alt={banner.title}
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {banner.title}
                  </h2>
                  {banner.subtitle && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                      {banner.subtitle}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

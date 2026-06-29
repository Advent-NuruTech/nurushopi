import Image from "next/image";
import { notFound } from "next/navigation";
import { getBanner } from "@/lib/data/catalog";

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

export default async function BannerDetails({ params }: PageProps) {
  const { id } = await params;
  const banner = await getBanner(id);
  if (!banner) notFound();

  return (
    <section className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">{banner.title}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="relative w-full aspect-[16/9] lg:aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          {banner.image ? (
            <Image src={banner.image} alt={banner.title} fill className="object-contain" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
          )}
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {banner.subtitle && (
            <div dangerouslySetInnerHTML={{ __html: formatText(banner.subtitle) }} />
          )}

          {banner.linkUrl && (
            <div className="mt-6">
              <a
                href={banner.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Open Link
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

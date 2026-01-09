"use client";

import Image from "next/image";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { notFound } from "next/navigation";

interface Banner {
  title: string;
  shortDescription: string;
  image?: string;
}

interface Props {
  params: { id: string };
}

/* 🔹 Text formatter: bold, underline, numbered points */
function formatText(text: string) {
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // bold
    .replace(/__(.*?)__/g, "<u>$1</u>") // underline
    .replace(/(^|\n)(\d+\.\s.*)/g, "<br /><span>$2</span>"); // numbered points

  return formatted;
}

export default async function BannerDetailPage({ params }: Props) {
  const ref = doc(db, "banners", params.id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return notFound();

  const banner = snap.data() as Banner;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Image */}
      <div className="relative w-full h-[60vh] bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden">
        {banner.image && (
          <Image
            src={banner.image}
            alt={banner.title}
            fill
            className="object-contain"
            priority
          />
        )}
      </div>

      {/* Content */}
      <div className="mt-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {banner.title}
        </h1>

        {/* 🔹 Formatted shortDescription */}
        <div
          className="mt-4 text-gray-700 dark:text-gray-300 leading-relaxed text-base"
          dangerouslySetInnerHTML={{
            __html: formatText(banner.shortDescription),
          }}
        />
      </div>
    </main>
  );
}

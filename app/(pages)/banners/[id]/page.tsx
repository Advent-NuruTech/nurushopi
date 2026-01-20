"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import Image from "next/image";

type Banner = {
  id: string;
  title: string;
  shortDescription: string;
  image?: string;
  link?: string; // <-- added
  createdAt?: Timestamp;
};

function formatText(text: string) {
  if (!text) return "";

  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<u>$1</u>");

  const paragraphs = formatted
    .split(/\n{2,}/)
    .map((p) => `<p class="mb-4">${p.trim()}</p>`)
    .join("");

  return paragraphs;
}

export default function BannerDetails() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanner = async () => {
      if (!id) return;

      try {
        const docRef = doc(db, "banners", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setBanner({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Banner, "id">),
          });
        }
      } catch (error) {
        console.error("Failed to fetch banner:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBanner();
  }, [id]);

  if (loading) return <div className="p-6 text-center">Loading...</div>;
  if (!banner) return <div className="p-6 text-center">Banner not found</div>;

  return (
    <section className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        {banner.title}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="relative w-full aspect-[16/9] lg:aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          {banner.image ? (
            <Image
              src={banner.image}
              alt={banner.title}
              fill
              className="object-contain"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No Image
            </div>
          )}
        </div>

        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <div
            dangerouslySetInnerHTML={{
              __html: formatText(banner.shortDescription),
            }}
          />

          {/* 🔥 LINK DISPLAY */}
          {banner.link && (
            <div className="mt-6">
              <a
                href={banner.link}
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

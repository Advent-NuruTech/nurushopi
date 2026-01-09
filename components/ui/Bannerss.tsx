"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";

interface Banner {
  id: string;
  title: string;
  shortDescription: string;
  image?: string;
  createdAt?: Timestamp;
}

/* 🔹 Same formatter as upload page, ESLint-safe */
function formatText(text: string) {
  const formatted = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // bold
    .replace(/__(.*?)__/g, "<u>$1</u>") // underline
    .replace(/(^|\n)(\d+\.\s.*)/g, "<br /><span>$2</span>"); // numbered points

  return formatted;
}

export default function Banners() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const fetchBanners = async () => {
      const q = query(collection(db, "banners"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);

      setBanners(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Banner, "id">),
        }))
      );
    };

    fetchBanners();
  }, []);

  return (
    <section className="relative w-full mt-2">
      <div className="w-full overflow-x-auto">
        <div className="flex flex-row gap-4 px-1 py-1">
          {banners.map((banner) => (
            <motion.div
              key={banner.id}
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.25 }}
              className="
                flex-none
                w-[260px]
                sm:w-[300px]
                lg:w-[320px]
                h-[420px]
                rounded-2xl
                overflow-hidden
                shadow-md
                bg-white
                dark:bg-gray-900
                border
                border-gray-200
                dark:border-gray-800
                flex
                flex-col
              "
            >
              {/* IMAGE */}
              <div className="relative w-full h-[75%] bg-gray-100 dark:bg-gray-800">
                {banner.image ? (
                  <Image
                    src={banner.image}
                    alt={banner.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 260px, 320px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
              </div>

              {/* CONTENT */}
              <div className="h-[25%] p-3 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                  {banner.title}
                </h3>

                {/* 🔹 Formatted description (line-clamp preserved) */}
                <div
                  className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1 flex-1 leading-snug"
                  dangerouslySetInnerHTML={{
                    __html: formatText(banner.shortDescription),
                  }}
                />

                <Link
                  href={`/banners/${banner.id}`}
                  className="
                    text-xs
                    font-medium
                    text-blue-600
                    dark:text-blue-400
                    hover:underline
                    self-start
                  "
                >
                  Read more →
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

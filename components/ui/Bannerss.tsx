"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import SectionHeader from "./SectionHeader";

interface Banner {
  id: string;
  title: string;
  shortDescription: string;
  image?: string;
  createdAt?: Timestamp;
  tag?: string;
}

function formatText(text: string) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<u>$1</u>")
    .replace(/\n+/g, " ");
}

export default function Bannerss() {
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

  if (!banners.length) return null;

  return (
    <section className="py-8 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-2 sm:px-6">
        <SectionHeader title="Promotions & Offers" href="/banners" />

        <div className="mt-4 flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-1">
          {banners.map((banner) => (
            <Link
              key={banner.id}
              href={`/banners/${banner.id}`}
              className="flex-none snap-start w-[320px] sm:w-[400px] lg:w-[480px] h-[200px] sm:h-[260px] lg:h-[300px] relative"
            >
              <motion.div
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.3 }}
                className="relative w-full h-full rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow bg-gray-100 dark:bg-gray-900"
              >
                {/* Banner Image */}
                {banner.image && (
                  <Image
                    src={banner.image}
                    alt={banner.title}
                    fill
                    className="object-contain w-full h-full"
                    sizes="(max-width: 640px) 320px, (max-width: 1024px) 400px, 480px"
                  />
                )}

                {/* Overlay gradient for text visibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />

                {/* Optional tag */}
                {banner.tag && (
                  <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full z-20">
                    {banner.tag}
                  </span>
                )}

                {/* Overlay text */}
                <div className="absolute bottom-4 left-4 z-20 w-[90%]">
                  <h3 className="font-bold text-white text-sm sm:text-base lg:text-lg line-clamp-1">
                    {banner.title}
                  </h3>
                  <p className="text-white text-xs sm:text-sm line-clamp-2 mt-1">
                    {formatText(banner.shortDescription)}
                  </p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

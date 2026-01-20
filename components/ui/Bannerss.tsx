"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

interface Banner {
  id: string;
  title: string;
  shortDescription: string;
  image?: string;
  createdAt?: Timestamp;
}

/* 🔹 Safe lightweight formatter */
function formatText(text: string) {
  if (!text) return "";

  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<u>$1</u>")
    .replace(/\n+/g, " ");
}

export default function Banners() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const fetchBanners = async () => {
      const q = query(
        collection(db, "banners"),
        orderBy("createdAt", "desc")
      );
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
    <section className="relative w-full mt-4">
      <div className="w-full overflow-x-auto">
        <div className="flex gap-5 px-2 py-3">
          {banners.map((banner) => (
            <Link
              key={banner.id}
              href={`/banners/${banner.id}`}
              className="flex-none"
            >
              <motion.article
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="
                  group
                  w-[260px]
                  sm:w-[300px]
                  lg:w-[320px]
                  h-[420px]
                  rounded-2xl
                  overflow-hidden
                  bg-white
                  dark:bg-gray-900
                  border
                  border-gray-200
                  dark:border-gray-800
                  shadow-sm
                  hover:shadow-xl
                  transition-shadow
                  flex
                  flex-col
                "
              >
                {/* IMAGE */}
                <div className="relative w-full h-[72%] bg-gray-100 dark:bg-gray-800">
                  {banner.image ? (
                    <Image
                      src={banner.image}
                      alt={banner.title}
                      fill
                      className="
                        object-contain
                        transition-transform
                        duration-300
                        group-hover:scale-[1.02]
                      "
                      sizes="(max-width: 640px) 260px, 320px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                      No Image
                    </div>
                  )}
                </div>

                {/* CONTENT */}
                <div className="flex flex-col p-4 h-[28%]">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                    {banner.title}
                  </h3>

                  <div
                    className="
                      mt-1
                      text-xs
                      text-gray-600
                      dark:text-gray-400
                      line-clamp-2
                      leading-snug
                      flex-1
                    "
                    dangerouslySetInnerHTML={{
                      __html: formatText(banner.shortDescription),
                    }}
                  />

                  <span
                    className="
                      mt-2
                      text-xs
                      font-medium
                      text-blue-600
                      dark:text-blue-400
                      group-hover:underline
                      self-start
                    "
                  >
                    View details →
                  </span>
                </div>
              </motion.article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

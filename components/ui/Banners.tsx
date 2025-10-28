"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

interface Banner {
  id: string;
  title: string;
  shortDescription: string;
  link?: string;
  image: string;
  createdAt?: any;
}

export default function Banners() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const q = query(collection(db, "banners"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Banner, "id">),
        }));
        setBanners(data);
      } catch (error) {
        console.error("Error fetching banners:", error);
      }
    };

    fetchBanners();
  }, []);

  return (
    <div className="relative w-full overflow-x-auto scrollbar-hide mt-6 rounded-2xl shadow-lg">
      <div className="flex gap-4 w-max px-4">
        {banners.map((banner) => (
          <motion.div
            key={banner.id}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
            className="relative flex-shrink-0 w-[300px] sm:w-[500px] md:w-[600px] h-[350px] sm:h-[450px] rounded-2xl overflow-hidden shadow-md"
          >
            <Image
              src={banner.image || "/placeholder.jpg"}
              alt={banner.title || "Banner"}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center text-white px-4">
              <h2 className="text-2xl sm:text-4xl font-bold drop-shadow-lg mb-3">
                {banner.title}
              </h2>
              <p className="text-base sm:text-lg opacity-90 mb-6">
                {banner.shortDescription}
              </p>

              {/* ✅ Fixed Link typing issue */}
              {banner.link && (
                <Link href={banner.link as any} passHref legacyBehavior>
                  <a className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full transition">
                    Learn More
                  </a>
                </Link>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

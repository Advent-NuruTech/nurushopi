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
  link?: string;
  image: string;
  createdAt?: Timestamp;
}

export default function Banners() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const q = query(collection(db, "banners"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => {
          const docData = doc.data() as Omit<Banner, "id">;
          return {
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt,
          };
        });
        setBanners(data);
      } catch (error) {
        console.error("Error fetching banners:", error);
      }
    };

    fetchBanners();
  }, []);

  return (
    <div className="relative w-full mt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 px-4">
        {banners.map((banner) => (
          <motion.div
            key={banner.id}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
            className="relative w-full h-[350px] sm:h-[250px] md:h-[300px] rounded-2xl overflow-hidden shadow-md"
          >
            <Image
              src={banner.image || "/placeholder.jpg"}
              alt={banner.title || "Banner"}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-center items-center text-center text-white px-4">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold drop-shadow-lg mb-2">
                {banner.title}
              </h2>
              <p className="text-sm sm:text-base md:text-lg opacity-90 mb-4">
                {banner.shortDescription}
              </p>
              {/* ✅ Type-safe Link */}
              {banner.link && (
                <Link
                  href={{ pathname: banner.link }} // converts string to UrlObject
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition"
                >
                  Learn More
                </Link>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";

import { formatPrice } from "@/lib/formatPrice";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { getDiscountPercent, getOriginalPrice, getSellingPrice } from "@/lib/pricing";

/* =========================
   TYPES
========================= */
interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  sellingPrice?: number;
  shortDescription?: string;
  description?: string;
  category: string;
  images: string[];
  createdAt?: string;
}

/* =========================
   COMPONENT
========================= */
export default function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [mainImage, setMainImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showFullDescription, setShowFullDescription] = useState(false);

  /* =========================
     DESCRIPTION LIMITER
  ========================= */
  const getShortDescription = (text: string, words = 60) => {
    const parts = text.split(" ");
    if (parts.length <= words) return text;
    return parts.slice(0, words).join(" ") + "...";
  };

  /* =========================
     FETCH PRODUCT
  ========================= */
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "products", id));

        if (!snap.exists()) {
          setError("Product not found");
          return;
        }

        const d = snap.data();

        const images =
          Array.isArray(d.images) && d.images.length > 0
            ? d.images
            : [d.imageUrl || "/images/placeholder.png"];

        const prod: Product = {
          id: snap.id,
          name: String(d.name ?? "Unnamed product"),
          price: Number(d.sellingPrice ?? d.price ?? 0),
          sellingPrice: Number(d.sellingPrice ?? d.price ?? 0),
          originalPrice:
            typeof d.originalPrice === "number" && Number.isFinite(d.originalPrice)
              ? d.originalPrice
              : undefined,
          shortDescription: d.shortDescription ?? "",
          description: d.description ?? "",
          category: String(d.category ?? "general"),
          images,
          createdAt: d.createdAt,
        };

        setProduct(prod);
        setMainImage(images[0]);

        /* Related products */
        const relatedSnap = await getDocs(
          query(
            collection(db, "products"),
            where("category", "==", prod.category),
            limit(4)
          )
        );

        setRelatedProducts(
          relatedSnap.docs
            .filter((r) => r.id !== prod.id)
            .map((r) => {
              const rd = r.data();
              return {
                id: r.id,
                name: String(rd.name ?? ""),
                price: Number(rd.sellingPrice ?? rd.price ?? 0),
                sellingPrice: Number(rd.sellingPrice ?? rd.price ?? 0),
                originalPrice:
                  typeof rd.originalPrice === "number" && Number.isFinite(rd.originalPrice)
                    ? rd.originalPrice
                    : undefined,
                category: String(rd.category ?? "general"),
                images:
                  Array.isArray(rd.images) && rd.images.length > 0
                    ? rd.images
                    : [rd.imageUrl || "/images/placeholder.png"],
              };
            })
        );
      } catch (e: unknown) {
        console.error(e);
        setError(
          e instanceof Error
            ? e.message
            : "Unable to load product"
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  /* =========================
     CART
  ========================= */
  const handleAddToCart = () => {
    if (!product) return;

    const sellingPrice = getSellingPrice(product);
    addToCart({
      id: product.id,
      name: product.name,
      price: sellingPrice,
      quantity: 1,
      image: mainImage,
    });
  };

  /* =========================
     STATES
  ========================= */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <p className="text-slate-500">Loading product…</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <p className="text-lg font-semibold">{error}</p>
        <Button className="mt-4" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const discountPercent = getDiscountPercent(product);
  const originalPrice = getOriginalPrice(product);
  const sellingPrice = getSellingPrice(product);

  /* =========================
     UI
  ========================= */
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 py-20 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* ================= IMAGE SECTION ================= */}
        <section>
          {/* Main image */}
          <div className="relative w-full h-[420px] rounded-lg overflow-hidden shadow-md bg-white dark:bg-gray-800">
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-contain p-4"
              priority
            />
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-3 mt-4 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setMainImage(img)}
                  aria-label={`View image ${i + 1}`}
                  className={`relative w-20 h-20 border rounded-md overflow-hidden ${
                    mainImage === img ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <Image
                    src={img}
                    alt=""
                    fill
                    className="object-contain p-1"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ================= DETAILS SECTION ================= */}
        <aside className="space-y-6">
          <div className="flex items-end gap-3">
            {discountPercent && originalPrice && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {formatPrice(sellingPrice)}
            </div>
            {discountPercent && (
              <span className="px-2 py-1 rounded-full bg-red-600 text-white text-xs font-semibold">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <Button size="lg" variant="outline" onClick={handleAddToCart}>
              Add to Cart
            </Button>

            <Button
              size="lg"
              onClick={() => router.push("/checkout" as Route)}
            >
              Buy Now
            </Button>
          </div>

          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>

            {product.shortDescription && (
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                {product.shortDescription}
              </p>
            )}
          </div>

          {/* ===== Description with Read More ===== */}
          {product.description && (
            <section className="pt-6 border-t">
              <h2 className="font-semibold text-lg mb-3">
                Product Details
              </h2>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 leading-relaxed text-slate-700 dark:text-slate-300">
                <p className="whitespace-pre-line">
                  {showFullDescription
                    ? product.description
                    : getShortDescription(product.description)}
                </p>

                {product.description.split(" ").length > 60 && (
                  <button
                    onClick={() =>
                      setShowFullDescription(!showFullDescription)
                    }
                    className="mt-3 text-blue-600 font-medium hover:underline"
                  >
                    {showFullDescription
                      ? "Read less"
                      : "Read more"}
                  </button>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* ================= RELATED PRODUCTS ================= */}
      {relatedProducts.length > 0 && (
        <section className="max-w-6xl mx-auto mt-16">
          <h2 className="text-xl font-semibold mb-6">
            Related Products
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {relatedProducts.map((rel) => {
              const discountPercent = getDiscountPercent(rel);
              const originalPrice = getOriginalPrice(rel);
              const sellingPrice = getSellingPrice(rel);
              return (
                <Link
                  key={rel.id}
                  href={`/products/${rel.id}` as Route}
                  className="relative border rounded-md p-3 hover:shadow-md transition"
                >
                  {discountPercent && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      {discountPercent}% OFF
                    </div>
                  )}
                  <div className="relative w-full h-40 rounded overflow-hidden">
                    <Image
                      src={rel.images[0]}
                      alt={rel.name}
                      fill
                      className="object-contain p-2"
                    />
                  </div>

                  <h3 className="mt-2 font-medium text-sm">
                    {rel.name}
                  </h3>

                  <div className="mt-1">
                    {discountPercent && originalPrice && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatPrice(originalPrice)}
                      </span>
                    )}
                    <p className="text-blue-600 font-semibold text-sm">
                      {formatPrice(sellingPrice)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import FormattedDescription from "@/components/ui/FormattedDescription";

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
  createdAt?: string | number | null;
}

interface Review {
  id: string;
  userName: string;
  message: string;
  createdAt?: string;
}

function toText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

/* =========================
   COMPONENT
========================= */
export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [mainImage, setMainImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const reviewDate = (value: unknown) => {
    if (!value) return "";
    if (typeof value === "string" || typeof value === "number") {
      return new Date(value).toLocaleDateString();
    }
    if (typeof value === "object" && value && "toDate" in value) {
      const d = (value as { toDate: () => Date }).toDate();
      return d.toLocaleDateString();
    }
    if (typeof value === "object" && value && "seconds" in value) {
      const s = (value as { seconds: number }).seconds;
      return new Date(s * 1000).toLocaleDateString();
    }
    return "";
  };

  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

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
            : [d.imageUrl || "/assets/logo.jpg"];

        const shortDescription =
          toText(d.shortDescription) ||
          toText((d as Record<string, unknown>).short_description) ||
          toText((d as Record<string, unknown>).shortDesc);
        const description = toText(d.description) || shortDescription;

        const prod: Product = {
          id: snap.id,
          name: String(d.name ?? "Unnamed product"),
          price: Number(d.sellingPrice ?? d.price ?? 0),
          sellingPrice: Number(d.sellingPrice ?? d.price ?? 0),
          originalPrice:
            typeof d.originalPrice === "number" && Number.isFinite(d.originalPrice)
              ? d.originalPrice
              : undefined,
          shortDescription,
          description,
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
                    : [rd.imageUrl || "/assets/logo.jpg"],
                createdAt:
                  typeof rd.createdAt === "string" || typeof rd.createdAt === "number"
                    ? rd.createdAt
                    : null,
              };
            })
            .sort((a, b) => {
              const aTime =
                typeof a.createdAt === "number"
                  ? a.createdAt
                  : typeof a.createdAt === "string"
                  ? Date.parse(a.createdAt)
                  : 0;
              const bTime =
                typeof b.createdAt === "number"
                  ? b.createdAt
                  : typeof b.createdAt === "string"
                  ? Date.parse(b.createdAt)
                  : 0;
              return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
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

  useEffect(() => {
    if (!id) return;
    setReviewsLoading(true);
    fetch(`/api/reviews?productId=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews ?? []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
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
  const productDescription =
    toText(product.description) ||
    toText(product.shortDescription) ||
    "No description available for this product yet.";

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
          </div>

          {/* ===== Description Preview ===== */}
          <section className="pt-6 border-t">
            <h2 className="font-semibold text-lg mb-3">
              Product Details
            </h2>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 leading-relaxed text-slate-700 dark:text-slate-300">
              <p>{getShortDescription(productDescription)}</p>

              {productDescription.split(" ").length > 60 && (
                <button
                  onClick={() => setIsDescriptionOpen(true)}
                  className="mt-3 text-blue-600 font-medium hover:underline"
                >
                  Read full description
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>
{reviews.length > 0 && (
  <section className="max-w-6xl mx-auto mt-16 px-4 sm:px-6">
    <div className="mb-10 text-center md:text-left">
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
        What clients say about this product
      </h2>
      <div className="flex items-center justify-center md:justify-start gap-2">
        <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
        <p className="text-slate-600 dark:text-slate-400">
          Real experiences from {reviews.length} customers
        </p>
      </div>
    </div>
    
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {reviews.map((r, index) => {
        // Enhanced color palette with gradients
        const colorSchemes = [
          {
            bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20',
            border: 'border-amber-200 dark:border-amber-800',
            accent: 'text-amber-600 dark:text-amber-400',
            badge: 'bg-amber-200/50 dark:bg-amber-800/30',
            shadow: 'hover:shadow-amber-200/50 dark:hover:shadow-amber-900/30'
          },
          {
            bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20',
            border: 'border-emerald-200 dark:border-emerald-800',
            accent: 'text-emerald-600 dark:text-emerald-400',
            badge: 'bg-emerald-200/50 dark:bg-emerald-800/30',
            shadow: 'hover:shadow-emerald-200/50 dark:hover:shadow-emerald-900/30'
          },
          {
            bg: 'bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-950/30 dark:to-sky-900/20',
            border: 'border-sky-200 dark:border-sky-800',
            accent: 'text-sky-600 dark:text-sky-400',
            badge: 'bg-sky-200/50 dark:bg-sky-800/30',
            shadow: 'hover:shadow-sky-200/50 dark:hover:shadow-sky-900/30'
          },
          {
            bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/20',
            border: 'border-rose-200 dark:border-rose-800',
            accent: 'text-rose-600 dark:text-rose-400',
            badge: 'bg-rose-200/50 dark:bg-rose-800/30',
            shadow: 'hover:shadow-rose-200/50 dark:hover:shadow-rose-900/30'
          },
          {
            bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20',
            border: 'border-purple-200 dark:border-purple-800',
            accent: 'text-purple-600 dark:text-purple-400',
            badge: 'bg-purple-200/50 dark:bg-purple-800/30',
            shadow: 'hover:shadow-purple-200/50 dark:hover:shadow-purple-900/30'
          },
          {
            bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20',
            border: 'border-orange-200 dark:border-orange-800',
            accent: 'text-orange-600 dark:text-orange-400',
            badge: 'bg-orange-200/50 dark:bg-orange-800/30',
            shadow: 'hover:shadow-orange-200/50 dark:hover:shadow-orange-900/30'
          }
        ];

        const scheme = colorSchemes[index % colorSchemes.length];
        
        return (
          <div
            key={r.id}
            className={`group relative ${scheme.bg} border-2 ${scheme.border} 
                       rounded-2xl p-6 transition-all duration-300 
                       hover:shadow-xl ${scheme.shadow} hover:-translate-y-1 
                       hover:border-opacity-50 backdrop-blur-sm overflow-hidden`}
          >
            {/* Decorative corner accent */}
            <div className={`absolute top-0 right-0 w-16 h-16 
                           bg-gradient-to-br ${scheme.bg} opacity-30 
                           rounded-bl-3xl -mr-2 -mt-2 blur-sm`} />
            
            {/* Quote watermark */}
            <div className={`absolute bottom-2 right-4 text-7xl font-serif 
                           opacity-10 ${scheme.accent} select-none`}>
              &ldquo;
            </div>
            
            {/* User avatar with color accent */}
            <div className="flex items-start gap-4 mb-4">
              <div className={`relative flex-shrink-0 w-12 h-12 rounded-full 
                             bg-white dark:bg-slate-800 border-2 ${scheme.border}
                             flex items-center justify-center overflow-hidden
                             shadow-md group-hover:scale-110 transition-transform duration-300`}>
                <span className={`text-lg font-bold ${scheme.accent}`}>
                  {r.userName.charAt(0).toUpperCase()}
                </span>
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-20 
                               bg-gradient-to-br ${scheme.bg} transition-opacity duration-300`} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                    {r.userName}
                  </h3>
                  
                  {/* Verified badge */}
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full 
                                 ${scheme.badge} text-xs ${scheme.accent}`}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Verified</span>
                  </div>
                </div>
                
               
              </div>
            </div>
            
            {/* Review message with fancy quote marks */}
            <div className="relative mb-6">
              <span className={`absolute -left-2 -top-2 text-4xl opacity-20 
                              ${scheme.accent} select-none`}>&ldquo;</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed 
                          pl-4 relative z-10">
                {r.message}
              </p>
            </div>
            
            {/* Footer with interactions */}
            <div className="flex items-center justify-between mt-4 pt-4 
                          border-t border-slate-200 dark:border-slate-700 
                          border-dashed">
              <div className="flex items-center gap-3">
               
                <button className={`flex items-center gap-1 text-sm 
                                   text-slate-500 hover:${scheme.accent} 
                                   dark:text-slate-400 transition-colors duration-200`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
              </div>
              
              {/* Date with icon */}
              <div className={`flex items-center gap-1 text-xs ${scheme.accent} opacity-75`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {reviewDate(r.createdAt)}
              </div>
            </div>
            
            {/* Color-coded floating indicator */}
            <div className={`absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-12 
                           rounded-full ${scheme.border} opacity-50 
                           group-hover:h-16 transition-all duration-300`} />
          </div>
        );
      })}
    </div>
    
    {/* View all reviews button with color matching */}
    {reviews.length >= 6 && (
      <div className="flex justify-center mt-10">
        <button className="group relative px-8 py-3 bg-slate-900 dark:bg-slate-100 
                         text-white dark:text-slate-900 rounded-xl font-medium 
                         overflow-hidden transition-all duration-300 
                         hover:shadow-xl hover:shadow-slate-200/50 
                         dark:hover:shadow-slate-800/50">
          <span className="relative z-10 flex items-center gap-2">
            View all {reviews.length} reviews
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 5l7 7-7 7" />
            </svg>
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 
                        opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>
      </div>
    )}
  </section>
)}

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
              const createdAtMs =
                typeof rel.createdAt === "number"
                  ? rel.createdAt
                  : typeof rel.createdAt === "string"
                  ? Date.parse(rel.createdAt)
                  : 0;
              const isNew =
                Number.isFinite(createdAtMs) &&
                createdAtMs > 0 &&
                Date.now() - createdAtMs <= 7 * 24 * 60 * 60 * 1000;
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
                  {isNew && (
                    <div className="absolute top-2 left-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      NEW
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

      {/* Description Modal */}
      {isDescriptionOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {product.name} - Description
              </h3>
              <button
                onClick={() => setIsDescriptionOpen(false)}
                className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
                <FormattedDescription text={productDescription} />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

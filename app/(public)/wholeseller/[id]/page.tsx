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
import FormattedDescription from "@/components/ui/FormattedDescription";

interface WholesaleProduct {
  id: string;
  name: string;
  price?: number;
  wholesalePrice: number;
  wholesaleMinQty?: number;
  wholesaleUnit?: string;
  shortDescription?: string;
  description?: string;
  category?: string;
  images: string[];
  mode?: string;
}

interface Review {
  id: string;
  userName: string;
  message: string;
  createdAt?: string;
}

const getShortDescription = (text: string, words = 60) => {
  const parts = text.split(" ");
  if (parts.length <= words) return text;
  return parts.slice(0, words).join(" ") + "...";
};

const getDiscountPercent = (retail?: number, wholesale?: number) => {
  if (!retail || !wholesale || retail <= 0 || wholesale <= 0) return null;
  const discount = Math.round(((retail - wholesale) / retail) * 100);
  return discount > 0 ? discount : null;
};

export default function WholesaleProductPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<WholesaleProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<WholesaleProduct[]>([]);
  const [mainImage, setMainImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
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

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "products", id));

        if (!snap.exists()) {
          setError("Wholesale product not found");
          return;
        }

        const d = snap.data() as Record<string, unknown>;
        if (String(d.mode ?? "") !== "wholesale") {
          setError("Wholesale product not found");
          return;
        }

        const images =
          Array.isArray(d.images) && d.images.length > 0
            ? (d.images as string[])
            : [String(d.coverImage ?? d.imageUrl ?? "/assets/logo.jpg")];

        const prod: WholesaleProduct = {
          id: snap.id,
          name: String(d.name ?? "Wholesale product"),
          price: typeof d.price === "number" ? d.price : undefined,
          wholesalePrice: Number(d.wholesalePrice ?? 0),
          wholesaleMinQty:
            typeof d.wholesaleMinQty === "number" ? d.wholesaleMinQty : undefined,
          wholesaleUnit: String(d.wholesaleUnit ?? ""),
          shortDescription: String(d.shortDescription ?? ""),
          description: String(d.description ?? ""),
          category: String(d.category ?? "general"),
          images,
          mode: String(d.mode ?? ""),
        };

        setProduct(prod);
        setMainImage(images[0]);

        const relatedSnap = await getDocs(
          query(
            collection(db, "products"),
            where("category", "==", prod.category),
            limit(4)
          )
        );

        const related = relatedSnap.docs
          .filter((r) => r.id !== prod.id)
          .map((r) => {
            const rd = r.data() as Record<string, unknown>;
            if (String(rd.mode ?? "") !== "wholesale") return null;
            const relImages =
              Array.isArray(rd.images) && rd.images.length > 0
                ? (rd.images as string[])
                : [String(rd.coverImage ?? rd.imageUrl ?? "/assets/logo.jpg")];
            return {
              id: r.id,
              name: String(rd.name ?? ""),
              price: typeof rd.price === "number" ? rd.price : undefined,
              wholesalePrice: Number(rd.wholesalePrice ?? 0),
              wholesaleMinQty:
                typeof rd.wholesaleMinQty === "number" ? rd.wholesaleMinQty : undefined,
              wholesaleUnit: String(rd.wholesaleUnit ?? ""),
              category: String(rd.category ?? "general"),
              images: relImages,
              mode: String(rd.mode ?? ""),
            } as WholesaleProduct;
          })
          .filter(Boolean) as WholesaleProduct[];

        setRelatedProducts(related);
      } catch (e: unknown) {
        console.error(e);
        setError(
          e instanceof Error ? e.message : "Unable to load wholesale product"
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

  const handleAddToCart = () => {
    if (!product) return;

    const minQty =
      typeof product.wholesaleMinQty === "number" && product.wholesaleMinQty > 0
        ? product.wholesaleMinQty
        : 1;

    addToCart({
      id: product.id,
      name: product.name,
      price: product.wholesalePrice,
      quantity: minQty,
      image: mainImage,
      category: product.category,
      mode: "wholesale",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <p className="text-slate-500">Loading wholesale product...</p>
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

  const discountPercent = getDiscountPercent(product.price, product.wholesalePrice);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 py-20 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image Section */}
        <section>
          <div className="relative w-full h-[420px] rounded-lg overflow-hidden shadow-md bg-white dark:bg-gray-800">
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-contain p-4"
              priority
            />
          </div>

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
                  <Image src={img} alt="" fill className="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Details Section */}
        <aside className="space-y-6">
          <div className="flex items-end gap-3 flex-wrap">
            {typeof product.price === "number" && product.price > 0 && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(product.price)}
              </span>
            )}
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {formatPrice(product.wholesalePrice)}
            </div>
            <span className="px-2 py-1 rounded-full bg-blue-600 text-white text-xs font-semibold uppercase">
              Wholesale
            </span>
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
            <Button size="lg" onClick={() => router.push("/checkout" as Route)}>
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

          <div className="rounded-lg border bg-slate-50 dark:bg-slate-800 p-4 space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Minimum order:{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {product.wholesaleMinQty ?? 1} {product.wholesaleUnit || "unit"}
              </span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Price per {product.wholesaleUnit || "unit"}:{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatPrice(product.wholesalePrice)}
              </span>
            </p>
          </div>

          {product.description && (
            <section className="pt-6 border-t">
              <h2 className="font-semibold text-lg mb-3">Product Details</h2>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 leading-relaxed text-slate-700 dark:text-slate-300">
                <p>{getShortDescription(product.description)}</p>
                {product.description.split(" ").length > 60 && (
                  <button
                    onClick={() => setIsDescriptionOpen(true)}
                    className="mt-3 text-blue-600 font-medium hover:underline"
                  >
                    Read full description
                  </button>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>

      {relatedProducts.length > 0 && (
        <section className="max-w-6xl mx-auto mt-16">
          <h2 className="text-xl font-semibold mb-6">Related Wholesale Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {relatedProducts.map((rel) => (
              <Link
                key={rel.id}
                href={`/wholeseller/${rel.id}` as Route}
                className="relative border rounded-md p-3 hover:shadow-md transition"
              >
                <div className="relative w-full h-40 rounded overflow-hidden">
                  <Image
                    src={rel.images[0]}
                    alt={rel.name}
                    fill
                    className="object-contain p-2"
                  />
                </div>

                <h3 className="mt-2 font-medium text-sm">{rel.name}</h3>
                <p className="text-blue-600 font-semibold text-sm mt-1">
                  {formatPrice(rel.wholesalePrice)} / {rel.wholesaleUnit || "unit"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Min: {rel.wholesaleMinQty ?? 1} {rel.wholesaleUnit || "unit"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="max-w-6xl mx-auto mt-16">
          <h2 className="text-xl font-semibold mb-4">
            What people say about this product
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="border rounded-xl p-4 bg-white dark:bg-slate-900"
              >
                <p className="text-sm text-slate-500">
                  {reviewDate(r.createdAt)}
                </p>
                <p className="font-semibold text-slate-900 dark:text-white">{r.userName}</p>
                <p className="text-slate-700 dark:text-slate-300 mt-2">{r.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {isDescriptionOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {product.name} — Description
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
                <FormattedDescription text={product.description ?? ""} />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

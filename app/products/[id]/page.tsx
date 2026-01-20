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

interface Product {
  id: string;
  name: string;
  price: number;
  shortDescription?: string;
  description?: string;
  category: string;
  images: string[];
  createdAt?: string;
}

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

  /* =========================
     FETCH PRODUCT (SAFE)
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
          price: Number(d.price ?? 0),
          shortDescription: d.shortDescription ?? "",
          description: d.description ?? "",
          category: String(d.category ?? "general"),
          images,
          createdAt: d.createdAt,
        };

        setProduct(prod);
        setMainImage(images[0]);

        /* ---- Related products ---- */
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
                price: Number(rd.price ?? 0),
                category: rd.category,
                images:
                  Array.isArray(rd.images) && rd.images.length > 0
                    ? rd.images
                    : [rd.imageUrl || "/images/placeholder.png"],
              };
            })
        );
      } catch (e) {
        console.error(e);
        setError("Unable to load product");
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
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
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

  /* =========================
     UI (COLORS UNCHANGED)
  ========================= */
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 py-20 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">

        {/* IMAGES */}
        <section>
          <div className="relative w-full h-[420px] rounded-lg overflow-hidden shadow-md">
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover"
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
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* DETAILS */}
        <aside className="space-y-6">
          <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
            {formatPrice(product.price)}
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

          {product.description && (
            <section className="pt-4 border-t">
              <h2 className="font-semibold text-lg mb-2">
                Product Details
              </h2>
              <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                {product.description}
              </p>
            </section>
          )}
        </aside>
      </div>

      {/* RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <section className="max-w-6xl mx-auto mt-16">
          <h2 className="text-xl font-semibold mb-6">
            Related Products
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {relatedProducts.map((rel) => (
              <Link
                key={rel.id}
                href={`/products/${rel.id}` as Route}
                className="border rounded-md p-3 hover:shadow-md transition"
              >
                <div className="relative w-full h-40 rounded overflow-hidden">
                  <Image
                    src={rel.images[0]}
                    alt={rel.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <h3 className="mt-2 font-medium text-sm">
                  {rel.name}
                </h3>
                <p className="text-blue-600 font-semibold text-sm">
                  {formatPrice(rel.price)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

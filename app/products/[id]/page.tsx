"use client";

import React, { useEffect, useState } from "react";
import { notFound, useRouter } from "next/navigation";
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
  images?: string[];
  createdAt?: string;
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ✅ Required in Next.js 15+
  const { id } = React.use(params);

  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [mainImage, setMainImage] = useState<string>("");
  const [loading, setLoading] = useState(true);

  /* ---------------- Fetch product ---------------- */
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const ref = doc(db, "products", id);
        const snap = await getDoc(ref);

        if (!snap.exists()) return notFound();

        const data = snap.data();

        const fetchedProduct: Product = {
          id: snap.id,
          name: data.name,
          price: data.price,
          shortDescription: data.shortDescription ?? "",
          description: data.description ?? "",
          category: data.category,
          images:
            Array.isArray(data.images) && data.images.length > 0
              ? data.images
              : [data.imageUrl || "/images/placeholder.png"],
          createdAt: data.createdAt,
        };

        setProduct(fetchedProduct);
        setMainImage(fetchedProduct.images![0]);

        // Related products
        const q = query(
          collection(db, "products"),
          where("category", "==", fetchedProduct.category),
          limit(4)
        );

        const relatedSnap = await getDocs(q);

        const related: Product[] = relatedSnap.docs
          .filter((d) => d.id !== id)
          .map((d) => {
            const rd = d.data();
            return {
              id: d.id,
              name: rd.name,
              price: rd.price,
              category: rd.category,
              images: Array.isArray(rd.images)
                ? rd.images
                : [rd.imageUrl || "/images/placeholder.png"],
            };
          });

        setRelatedProducts(related);
      } catch (err) {
        console.error("Error fetching product:", err);
        notFound();
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  /* ---------------- Cart ---------------- */
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

  if (loading || !product) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <p>Loading product...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 py-10 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="relative w-full h-[400px] rounded-lg overflow-hidden shadow-md">
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          </div>

          {product.images!.length > 1 && (
            <div className="flex gap-3 mt-4 overflow-x-auto">
              {product.images!.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setMainImage(img)}
                  className={`relative w-20 h-20 border rounded-md overflow-hidden ${
                    mainImage === img ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <aside>
          <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
            {formatPrice(product.price)}
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              size="lg"
              variant="outline"
              onClick={handleAddToCart}
            >
              Add to Cart
            </Button>

            <Button
              size="lg"
              onClick={() => router.push("/checkout" as Route)}
            >
              Buy Now
            </Button>
          </div>

          <h1 className="text-3xl font-bold mt-6">{product.name}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {product.shortDescription}
          </p>

          {product.description && (
            <div className="mt-6">
              <h2 className="font-semibold text-lg mb-2">Product Details</h2>
              <p>{product.description}</p>
            </div>
          )}
        </aside>
      </div>

      {/* Related */}
      {relatedProducts.length > 0 && (
        <section className="max-w-6xl mx-auto mt-12">
          <h2 className="text-xl font-semibold mb-5">Related Products</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {relatedProducts.map((rel) => {
              const href = `/products/${rel.id}` as Route;

              return (
                <Link
                  key={rel.id}
                  href={href}
                  className="border rounded-md p-3 hover:shadow-md transition"
                >
                  <div className="relative w-full h-40 rounded overflow-hidden">
                    <Image
                      src={rel.images![0]}
                      alt={rel.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <h3 className="mt-2 font-medium text-sm">{rel.name}</h3>
                  <p className="text-blue-600 font-semibold text-sm">
                    {formatPrice(rel.price)}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

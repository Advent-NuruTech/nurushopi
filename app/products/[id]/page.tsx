"use client";

import { notFound } from "next/navigation";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { formatPrice } from "@/lib/formatPrice";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = params; // ✅ direct access in client component

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [mainImage, setMainImage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

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
          shortDescription: data.shortDescription || "",
          description: data.description || "",
          category: data.category,
          images:
            Array.isArray(data.images) && data.images.length > 0
              ? data.images
              : [data.imageUrl || "/images/placeholder.png"],
          createdAt: data.createdAt,
        };

        setProduct(fetchedProduct);
        setMainImage(fetchedProduct.images?.[0] || "/images/placeholder.png");

        // Fetch related products
        const q = query(
          collection(db, "products"),
          where("category", "==", fetchedProduct.category),
          limit(4)
        );
        const relatedSnap = await getDocs(q);
        const related = relatedSnap.docs
          .filter((doc) => doc.id !== id)
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            images: Array.isArray(doc.data().images) ? doc.data().images : [doc.data().imageUrl || "/images/placeholder.png"]
          })) as Product[];

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
    <main className="min-h-screen bg-white dark:bg-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEFT SIDE - Images */}
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

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 mt-4 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setMainImage(img)}
                  className={`relative w-20 h-20 border rounded-md overflow-hidden flex-shrink-0 ${
                    mainImage === img ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT SIDE - Info */}
        <aside>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {product.name}
          </h1>

          <p className="text-slate-600 dark:text-slate-400 mt-2 text-md">
            {product.shortDescription}
          </p>

          <div className="text-3xl font-bold my-4 text-blue-700 dark:text-blue-400">
            {formatPrice(product.price)}
          </div>

          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleAddToCart}
            >
              Add to Cart
            </Button>

            <Button size="lg" variant="default" className="w-full">
              Buy Now
            </Button>
          </div>

          <p className="text-sm text-slate-500 mt-6 leading-relaxed">
            Delivery cost calculated at checkout.
            <br />
            <span className="font-medium">Category:</span> {product.category}
          </p>

          {/* Full description */}
          {product.description && (
            <div className="mt-6 text-gray-700 dark:text-gray-300">
              <h2 className="font-semibold text-lg mb-2">Product Details</h2>
              <p>{product.description}</p>
            </div>
          )}
        </aside>
      </div>

      {/* RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <section className="max-w-6xl mx-auto mt-12">
          <h2 className="text-xl font-semibold mb-5 text-gray-800 dark:text-gray-200">
            Related Products
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {relatedProducts.map((rel) => (
              <Link
                key={rel.id}
                href={`/products/${rel.id}`}
                className="border rounded-md p-3 shadow-sm hover:shadow-md transition"
              >
                <div className="relative w-full h-40 rounded overflow-hidden">
                  <Image
                    src={rel.images?.[0] || "/images/placeholder.png"}
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
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

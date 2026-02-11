"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/formatPrice";

interface WholesaleProduct {
  id: string;
  name?: string;
  coverImage?: string;
  image?: string;
  images?: string[];
  wholesalePrice?: number;
  wholesaleMinQty?: number;
  wholesaleUnit?: string;
}

export default function WholesaleCard({ product }: { product: WholesaleProduct }) {
  const { addToCart } = useCart();

  const imageSrc =
    product?.coverImage ||
    product?.image ||
    product?.images?.[0] ||
    "/assets/logo.jpg";

  const minQty =
    typeof product?.wholesaleMinQty === "number" && product.wholesaleMinQty > 0
      ? product.wholesaleMinQty
      : 1;

  const unit = product?.wholesaleUnit || "unit";

  const addWholesale = (e: React.MouseEvent) => {
    e.preventDefault(); // stop navigation
    e.stopPropagation();

    addToCart({
      id: product.id,
      name: product.name ?? "Wholesale product",
      price: Number(product?.wholesalePrice ?? 0),
      quantity: minQty,
      image: imageSrc,
      category: undefined,
      mode: "wholesale",
    });
  };

  return (
    <Link
      href={`/wholeseller/${product.id}`}
      className="border rounded-xl p-3 block hover:shadow transition bg-white dark:bg-slate-900"
    >
      <div className="relative h-40 w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
        <Image
          src={imageSrc}
          alt={product.name ?? "Wholesale product"}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover"
        />
      </div>

      <h3 className="font-semibold mt-2">
        {product.name}
      </h3>

      <p className="text-blue-600 font-bold">
        {formatPrice(Number(product?.wholesalePrice ?? 0))} / {unit}
      </p>

      <p className="text-sm text-gray-500">
        Minimum: {minQty} {unit}
      </p>

      <button
        onClick={addWholesale}
        className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
      >
        Add to Cart
      </button>
    </Link>
  );
}

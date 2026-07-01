"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/formatPrice";
import { useSabbathStatus } from "@/lib/useSabbathStatus";
import type { WholesaleCardVM } from "@/lib/view/catalog";

export default function WholesaleCard({ product }: { product: WholesaleCardVM }) {
  const { addToCart } = useCart();
  const { isClosed: sabbathClosed } = useSabbathStatus();

  const minQty = product.minQuantity > 0 ? product.minQuantity : 1;
  const inStock = product.inStock && product.stock >= minQty;

  const addWholesale = (e: React.MouseEvent) => {
    e.preventDefault(); // stop navigation
    e.stopPropagation();
    if (sabbathClosed || !inStock) return;

    addToCart({
      id: product.id,
      name: product.name,
      price: product.unitPrice,
      quantity: minQty,
      image: product.image,
      category: undefined,
      mode: "wholesale",
    });
  };

  return (
    <Link
      href={product.href}
      className="border rounded-xl p-3 block hover:shadow transition bg-white dark:bg-slate-900"
    >
      <div className="relative h-40 w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover"
        />
        {!inStock && (
          <div className="absolute inset-x-2 top-2 rounded-full bg-slate-900/85 px-2 py-1 text-center text-xs font-semibold text-white">
            Out of stock
          </div>
        )}
      </div>

      <h3 className="font-semibold mt-2">{product.name}</h3>

      <p className="text-blue-600 font-bold">{formatPrice(product.unitPrice)} / unit</p>

      <p className="text-sm text-gray-500">
        Minimum: {minQty} unit
      </p>
      <p className={`text-xs font-medium ${inStock ? "text-green-700" : "text-red-600"}`}>
        {inStock ? `${product.stock} in stock` : "Ordering disabled"}
      </p>

      <button
        onClick={addWholesale}
        disabled={sabbathClosed || !inStock}
        title={
          !inStock
            ? "Out of stock"
            : sabbathClosed
            ? "Shopping is paused for Sabbath"
            : "Add to Cart"
        }
        className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        {inStock ? "Add to Cart" : "Out of Stock"}
      </button>
    </Link>
  );
}

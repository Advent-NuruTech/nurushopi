"use client";

import Image from "next/image";
import Link from "next/link";
import { Boxes, Check, ShoppingCart, X } from "lucide-react";

import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/formatPrice";
import { useSabbathStatus } from "@/lib/useSabbathStatus";
import type { WholesaleCardVM } from "@/lib/view/catalog";
import ShareButton from "@/components/ui/ShareButton";

export default function WholesaleCard({ product }: { product: WholesaleCardVM }) {
  const { addToCart } = useCart();
  const { isClosed: sabbathClosed } = useSabbathStatus();
  const minQty = Math.max(1, product.minQuantity);
  const inStock = product.inStock && product.stock >= minQty;

  const addWholesale = () => {
    if (sabbathClosed || !inStock) return;
    addToCart({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.unitPrice,
      quantity: minQty,
      image: product.image,
      maxQuantity: product.stock,
      category: product.categorySlug ?? undefined,
      mode: "wholesale",
    });
  };

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-brand-border hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <ShareButton
        title={product.name}
        description={product.description}
        href={product.href}
        className="absolute right-2 top-2 z-20 sm:right-3 sm:top-3"
      />
      <Link
        href={product.href}
        className="relative block aspect-square overflow-hidden bg-white dark:bg-slate-950"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 25vw"
          className="object-contain p-3 transition-transform duration-500 group-hover:scale-105 sm:p-4"
        />
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm sm:left-3 sm:top-3">
          <Boxes size={12} /> Wholesale
        </span>
        {!inStock && (
          <span className="absolute inset-x-2 bottom-2 rounded-full bg-slate-950/85 px-2 py-1 text-center text-[11px] font-bold text-white">
            Out of stock
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.categoryName && (
          <p className="mb-1 truncate text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-strong dark:text-brand-bright">
            {product.categoryName}
          </p>
        )}
        <Link
          href={product.href}
          className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-900 hover:text-brand-strong dark:text-white dark:hover:text-brand-bright"
        >
          {product.name}
        </Link>

        <p className="mt-2 text-base font-black tracking-tight text-slate-950 dark:text-white">
          {formatPrice(product.unitPrice)}{" "}
          <span className="text-[11px] font-medium text-slate-500">/ unit</span>
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <Boxes size={13} /> Minimum order: {minQty} units
        </p>
        <p
          className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${inStock ? "text-brand-strong dark:text-brand-bright" : "text-rose-600"}`}
        >
          {inStock ? <Check size={13} /> : <X size={13} />}
          {inStock ? `${product.stock} units available` : "Ordering unavailable"}
        </p>

        <button
          type="button"
          onClick={addWholesale}
          disabled={sabbathClosed || !inStock}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 text-xs font-bold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
        >
          <ShoppingCart size={15} /> {inStock ? `Add ${minQty} to cart` : "Out of stock"}
        </button>
      </div>
    </article>
  );
}

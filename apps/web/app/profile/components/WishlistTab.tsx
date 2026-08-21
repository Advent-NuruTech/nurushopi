"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BellRing, CalendarDays, Heart, ShoppingCart, Trash2 } from "lucide-react";
import type { WishlistItemDTO } from "@nuru/types";
import { wishlistApi } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/formatPrice";
import RatingStars from "@/components/ui/RatingStars";
import { Button } from "@/components/ui/button";

export default function WishlistTab() {
  const { addToCart } = useCart();
  const [items, setItems] = useState<WishlistItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await wishlistApi.list({ status: "ACTIVE", pageSize: 100 });
      setItems(page.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (productId: string) => {
    setRemoving(productId);
    try {
      await wishlistApi.remove(productId);
      setItems((current) => current.filter((item) => item.productId !== productId));
    } finally {
      setRemoving(null);
    }
  };

  if (loading)
    return <p className="py-12 text-center text-sm text-slate-500">Loading saved items…</p>;
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
        <Heart className="mx-auto text-slate-400" size={34} />
        <h2 className="mt-4 text-lg font-bold">Your wishlist is empty</h2>
        <p className="mt-2 text-sm text-slate-500">
          Save products and optionally choose when you expect to be ready to buy.
        </p>
        <Link
          href="/shop"
          className="mt-5 inline-block font-semibold text-emerald-700 hover:underline"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Saved for later</h2>
        <p className="mt-1 text-sm text-slate-500">
          Your purchase plans and reminder dates in one place.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const product = item.product;
          return (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <Link
                href={product.slug ? `/products/${product.slug}` : `/products/${product.id}`}
                className="block"
              >
                <div className="relative aspect-square bg-white dark:bg-slate-950">
                  <Image
                    src={product.images[0] || "/assets/logo.png"}
                    alt={product.name}
                    fill
                    className="object-contain p-4"
                  />
                </div>
              </Link>
              <div className="p-4">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {product.brandName || product.storeName || "NuruShop"}
                </p>
                <Link
                  href={product.slug ? `/products/${product.slug}` : `/products/${product.id}`}
                  className="mt-1 line-clamp-2 font-bold hover:text-emerald-700"
                >
                  {product.name}
                </Link>
                <RatingStars
                  summary={product.ratingSummary}
                  size={13}
                  showValue={false}
                  className="mt-2 [&_span]:text-[11px]"
                />
                <p className="mt-2 text-lg font-black text-blue-700 dark:text-blue-400">
                  {formatPrice(Number(product.sellingPrice ?? product.price))}
                </p>

                {item.plannedPurchaseAt && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                    <p className="flex items-center gap-2 font-semibold">
                      <CalendarDays size={15} /> Planned for{" "}
                      {new Date(item.plannedPurchaseAt).toLocaleDateString()}
                    </p>
                    {item.remindersEnabled && (
                      <p className="mt-1 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <BellRing size={14} /> Reminders enabled
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    disabled={!product.inStock}
                    onClick={() =>
                      addToCart({
                        id: product.id,
                        slug: product.slug ?? undefined,
                        name: product.name,
                        brandName: product.brandName,
                        storeName: product.storeName,
                        price: Number(product.sellingPrice ?? product.price),
                        quantity: 1,
                        image: product.images[0] || "/assets/logo.png",
                        maxQuantity: product.stock,
                      })
                    }
                    className="flex-1 gap-2 bg-[#009933] text-white hover:bg-[#006B2C]"
                  >
                    <ShoppingCart size={16} /> {product.inStock ? "Add to cart" : "Out of stock"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Remove ${product.name}`}
                    disabled={removing === product.id}
                    onClick={() => remove(product.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

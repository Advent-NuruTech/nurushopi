import ProductCard from "./ProductCard";
import type { Product } from "@/lib/types";

interface ShareableProductCardProps {
  product: Product;
}

/** Kept as a compatibility wrapper; ProductCard now includes the shared control. */
export default function ShareableProductCard({ product }: ShareableProductCardProps) {
  return <ProductCard product={product} />;
}

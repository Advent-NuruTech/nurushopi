import WholesaleCard from "./WholesaleCard";
import type { WholesaleCardVM } from "@/lib/view/catalog";

interface WholesaleGridProps {
  products: WholesaleCardVM[];
}

export default function WholesaleGrid({ products }: WholesaleGridProps) {
  if (!products?.length) return <p>No wholesale products available.</p>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {products.map((p) => (
        <WholesaleCard key={p.id} product={p} />
      ))}
    </div>
  );
}

import WholesaleCard from "./WholesaleCard";
import type { WholesaleCardVM } from "@/lib/view/catalog";

interface WholesaleGridProps {
  products: WholesaleCardVM[];
}

export default function WholesaleGrid({ products }: WholesaleGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <WholesaleCard key={p.id} product={p} />
      ))}
    </div>
  );
}

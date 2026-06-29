import WholesaleGrid from "@/components/wholesale/WholesaleGrid";
import SectionHeader from "@/components/ui/SectionHeader";
import { listWholesaleItems } from "@/lib/data/wholesale";

export const metadata = {
  title: "Wholesale Products – NuruShop",
  description: "Buy in bulk with wholesale pricing at NuruShop.",
};

export default async function WholesellerPage() {
  const { items } = await listWholesaleItems({ pageSize: 60, sort: "newest" });

  return (
    <div className="pt-16 px-0 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-4">
        <SectionHeader title="Wholesale Products" href="/shop" viewText="Shop Retail" />
      </div>

      <p className="mb-6 text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto md:mx-0 leading-relaxed text-center md:text-left">
        Buy in bulk with wholesale pricing. Minimum order quantities apply.
      </p>

      <WholesaleGrid products={items} />
    </div>
  );
}

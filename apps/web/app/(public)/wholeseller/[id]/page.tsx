import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWholesaleItem, listWholesaleItems } from "@/lib/data/wholesale";
import WholesaleDetailView from "./WholesaleDetailView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getWholesaleItem(id);
  if (!product) return { title: "Wholesale product not found – NuruShop" };
  return {
    title: `${product.name} (Wholesale) – NuruShop`,
    description: product.description ?? `Buy ${product.name} wholesale at NuruShop.`,
  };
}

export default async function WholesaleProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getWholesaleItem(id);
  if (!product) notFound();

  const { items } = await listWholesaleItems({ pageSize: 5, sort: "newest" });
  const related = items.filter((p) => p.id !== product.id).slice(0, 4);

  return <WholesaleDetailView product={product} related={related} />;
}

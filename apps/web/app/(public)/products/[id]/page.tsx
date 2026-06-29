import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getRelatedProducts } from "@/lib/data/catalog";
import ProductDetailView from "./ProductDetailView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Product not found – NuruShop" };
  return {
    title: `${product.name} – NuruShop`,
    description:
      product.shortDescription ?? product.description ?? `Buy ${product.name} at NuruShop.`,
    openGraph: { images: product.images.slice(0, 1) },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const related = await getRelatedProducts(product.categorySlug, product.id, 4);

  return <ProductDetailView product={product} related={related} />;
}

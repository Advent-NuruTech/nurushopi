import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getRelatedProducts } from "@/lib/data/catalog";
import ProductDetailView from "./ProductDetailView";
import { shareDescription } from "@/lib/share";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Product not found – NuruShop" };
  const description = shareDescription(
    product.shortDescription ?? product.description,
    `Buy ${product.name} at NuruShop.`,
  );
  return {
    title: `${product.name} – NuruShop`,
    description,
    alternates: { canonical: product.href },
    openGraph: {
      title: product.name,
      description,
      url: product.href,
      type: "website",
      images: [{ url: product.image, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: [product.image],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const related = await getRelatedProducts(product.categorySlug, product.id, 4);

  return <ProductDetailView product={product} related={related} />;
}

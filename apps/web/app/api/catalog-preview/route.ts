import { NextRequest, NextResponse } from "next/server";

import { listProducts } from "@/lib/data/catalog";

export async function GET(request: NextRequest) {
  const categorySlug = request.nextUrl.searchParams.get("category")?.trim();

  if (!categorySlug) {
    return NextResponse.json({ items: [] }, { status: 400 });
  }

  const result = await listProducts({
    categorySlug,
    pageSize: 6,
    sort: "newest",
  });

  return NextResponse.json({
    items: result.items.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: product.sellingPrice,
    })),
  });
}

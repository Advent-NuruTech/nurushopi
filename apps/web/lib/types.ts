export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  brandName?: string | null;
  storeName?: string | null;
  description?: string;
  shortDescription?: string;
  price: number;
  originalPrice?: number;
  sellingPrice?: number;
  images: string[]; // Up to 3 images per product
  stock?: number;
  inStock?: boolean;
  lowStockThreshold?: number;
  stockStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  ratingSummary?: {
    average: number;
    count: number;
    distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  };

  category: string;
  slug?: string;
  createdAt?: unknown;
}

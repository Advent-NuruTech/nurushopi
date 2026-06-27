export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  sellingPrice?: number;
  imageUrl: string;
  category: string;
  slug?: string;
}

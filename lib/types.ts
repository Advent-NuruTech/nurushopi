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
  description?: string;
  shortDescription?: string;
  price: number;
  images: string[]; // Up to 3 images per product
  
  category: string;
  slug?: string;
}



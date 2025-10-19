export type Category =
| 'herbs'
| 'oils'
| 'egw'
| 'pioneers'
| 'authors'
| 'bibles'
| 'covers'
| 'songbooks'
| 'other';


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



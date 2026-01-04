export interface ProductDTO {
  id: number;
  name: string;
  price: number;
  imageurl: string;
  description?: string;
  category?: string;
  inStock: boolean;
}

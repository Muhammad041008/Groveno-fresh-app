import api from './api';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  emoji: string;
  color?: string;
}

export interface Product {
  _id: string;
  name: string;
  category: string | Category;
  weight: string;
  price: number;
  mrp: number;
  imageUrl?: string;
  emoji: string;
  badge?: string;
  description?: string;
  nutrition?: Array<{ label: string; value: string }>;
  inStock: boolean;
  availableForExpress: boolean;
  featured: boolean;
  avgRating?: number;
  totalRatings?: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  pages: number;
}

export async function getCategories(): Promise<Category[]> {
  const res = await api.get('/api/categories');
  return res.data.categories ?? res.data ?? [];
}

export async function getProducts(params: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
  express?: boolean;
}): Promise<ProductsResponse> {
  const res = await api.get('/api/products', { params });
  if (Array.isArray(res.data)) {
    return { products: res.data, total: res.data.length, page: 1, pages: 1 };
  }
  return res.data;
}

export async function getProductById(id: string): Promise<Product> {
  const res = await api.get(`/api/products/${id}`);
  return res.data.product ?? res.data;
}

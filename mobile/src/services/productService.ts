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

// ── Demo data (shown when API is unavailable) ─────────────────────────────
export const DEMO_CATEGORIES: Category[] = [
  { _id: 'c1', name: 'Vegetables', slug: 'vegetables', emoji: '🥦', color: '#22C55E' },
  { _id: 'c2', name: 'Fruits', slug: 'fruits', emoji: '🍎', color: '#EF4444' },
  { _id: 'c3', name: 'Dairy & Eggs', slug: 'dairy', emoji: '🥛', color: '#3B82F6' },
  { _id: 'c4', name: 'Grains & Pulses', slug: 'grains', emoji: '🌾', color: '#F59E0B' },
  { _id: 'c5', name: 'Herbs & Spices', slug: 'herbs', emoji: '🌿', color: '#10B981' },
  { _id: 'c6', name: 'Exotic Produce', slug: 'exotics', emoji: '🫐', color: '#8B5CF6' },
];

export const DEMO_PRODUCTS: Product[] = [
  { _id: 'p1', name: 'Tomato', category: 'c1', weight: '1 kg', price: 29, mrp: 39, emoji: '🍅', inStock: true, availableForExpress: true, featured: true, badge: 'Fresh', avgRating: 4.5, totalRatings: 210 },
  { _id: 'p2', name: 'Potato', category: 'c1', weight: '1 kg', price: 19, mrp: 25, emoji: '🥔', inStock: true, availableForExpress: true, featured: true, avgRating: 4.3, totalRatings: 180 },
  { _id: 'p3', name: 'Spinach', category: 'c1', weight: '250 g', price: 15, mrp: 20, emoji: '🥬', inStock: true, availableForExpress: false, featured: false },
  { _id: 'p4', name: 'Onion', category: 'c1', weight: '1 kg', price: 25, mrp: 32, emoji: '🧅', inStock: true, availableForExpress: true, featured: false, badge: 'Popular' },
  { _id: 'p5', name: 'Apple', category: 'c2', weight: '500 g', price: 89, mrp: 110, emoji: '🍎', inStock: true, availableForExpress: true, featured: true, badge: 'Premium', avgRating: 4.7, totalRatings: 95 },
  { _id: 'p6', name: 'Banana', category: 'c2', weight: '6 pcs', price: 39, mrp: 50, emoji: '🍌', inStock: true, availableForExpress: true, featured: true },
  { _id: 'p7', name: 'Carrot', category: 'c1', weight: '500 g', price: 22, mrp: 28, emoji: '🥕', inStock: true, availableForExpress: true, featured: false },
  { _id: 'p8', name: 'Cucumber', category: 'c1', weight: '500 g', price: 18, mrp: 24, emoji: '🥒', inStock: true, availableForExpress: false, featured: false },
  { _id: 'p9', name: 'Capsicum', category: 'c1', weight: '250 g', price: 35, mrp: 45, emoji: '🫑', inStock: true, availableForExpress: true, featured: false },
  { _id: 'p10', name: 'Milk', category: 'c3', weight: '500 ml', price: 28, mrp: 30, emoji: '🥛', inStock: true, availableForExpress: true, featured: false, badge: 'Daily Fresh' },
  { _id: 'p11', name: 'Mango', category: 'c2', weight: '4 pcs', price: 120, mrp: 150, emoji: '🥭', inStock: true, availableForExpress: true, featured: true, badge: 'Seasonal' },
  { _id: 'p12', name: 'Garlic', category: 'c5', weight: '100 g', price: 40, mrp: 55, emoji: '🧄', inStock: true, availableForExpress: false, featured: false },
];

// ────────────────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  try {
    const res = await api.get('/api/categories');
    const cats = res.data.categories ?? res.data ?? [];
    return cats.length > 0 ? cats : DEMO_CATEGORIES;
  } catch {
    return DEMO_CATEGORIES;
  }
}

export async function getProducts(params: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
  express?: boolean;
}): Promise<ProductsResponse> {
  try {
    const res = await api.get('/api/products', { params });
    if (Array.isArray(res.data)) {
      const list = res.data as Product[];
      return { products: list.length > 0 ? list : DEMO_PRODUCTS, total: list.length, page: 1, pages: 1 };
    }
    const data = res.data as ProductsResponse;
    if (!data.products || data.products.length === 0) {
      return { products: DEMO_PRODUCTS, total: DEMO_PRODUCTS.length, page: 1, pages: 1 };
    }
    return data;
  } catch {
    let products = DEMO_PRODUCTS;
    if (params.search) {
      const q = params.search.toLowerCase();
      products = DEMO_PRODUCTS.filter((p) => p.name.toLowerCase().includes(q));
    } else if (params.category) {
      products = DEMO_PRODUCTS.filter((p) => p.category === params.category);
    } else if (params.featured) {
      products = DEMO_PRODUCTS.filter((p) => p.featured);
    } else if (params.express) {
      products = DEMO_PRODUCTS.filter((p) => p.availableForExpress);
    }
    return { products, total: products.length, page: 1, pages: 1 };
  }
}

export async function getProductById(id: string): Promise<Product> {
  try {
    const res = await api.get(`/api/products/${id}`);
    return res.data.product ?? res.data;
  } catch {
    return DEMO_PRODUCTS.find((p) => p._id === id) ?? DEMO_PRODUCTS[0];
  }
}

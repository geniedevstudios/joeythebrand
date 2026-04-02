export type Category = "all" | "always-lit" | "limited-edition" | "sample-sale";

export interface ProductSize {
  name: string;
  available: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  categoryName: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  description: string;
  details: string[];
  sizes: ProductSize[];
  isOutOfStock: boolean;
  isLimited: boolean;
  isBestSeller: boolean;
  featured: boolean;
}

export interface PromotionCode {
  id: string;
  code: string;
  percentage: number;
  active: boolean;
  expiresAt?: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  items: OrderItem[];
  total: number;
  discount: number;
  promotionCode?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  size: string;
  price: number;
  quantity: number;
  image: string;
}

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export interface SiteContent {
  heroImage: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutImage: string;
  aboutText: string;
  featuredProductIds: string[];
}

// Tipe bersama untuk website KOPDES (landing + app).
// Selaras dengan envelope backend NestJS: { success, message?, data }.

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN_KOPDES'
  | 'PEGAWAI_KOPDES'
  | 'CUSTOMER'
  | 'UMKM'
  | 'COURIER';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  isActive: boolean;
  category?: { id: string; name: string };
  images?: ProductImage[];
}

export interface ProductListResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CartLineProduct {
  id: string;
  name: string;
  price: number;
  images?: ProductImage[];
}

export interface CartItem {
  id: string;
  quantity: number;
  product?: CartLineProduct | null;
  umkmProduct?: CartLineProduct | null;
}

export interface Cart {
  id: string;
  items: CartItem[];
}

export type PaymentMethod = 'QRIS' | 'COD';

export interface Order {
  id: string;
  totalAmount: number;
  status: string;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  createdAt: string;
  items?: Array<{
    id: string;
    quantity: number;
    price: number;
    product?: CartLineProduct | null;
    umkmProduct?: CartLineProduct | null;
  }>;
}

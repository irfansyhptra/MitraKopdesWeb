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

  /// Kopdes penugasan staf. Null untuk pelanggan, mitra, kurir, super admin.
  kopdesId?: string | null;
  kopdes?: { id: string; name: string; village: string } | null;

  /// Permission efektif yang dihitung backend. Dipakai hanya untuk
  /// menyembunyikan tindakan yang memang akan ditolak — pembatasannya
  /// tetap `PermissionsGuard` di server.
  permissions?: string[];
}

/** Cerminan `backend/src/common/permissions.ts`. */
export const Permissions = {
  productCreate: 'product:create',
  productUpdate: 'product:update',
  productDelete: 'product:delete',
  categoryManage: 'category:manage',
  orderRead: 'order:read',
  orderProcess: 'order:process',
  orderCancel: 'order:cancel',
  deliveryRead: 'delivery:read',
  deliveryAssign: 'delivery:assign',
  deliveryUnassign: 'delivery:unassign',
  inventoryRead: 'inventory:read',
  inventoryAdjust: 'inventory:adjust',
  inventoryOpname: 'inventory:opname',
  financeReadSummary: 'finance:read:summary',
  financeReadFull: 'finance:read:full',
  mitraRead: 'mitra:read',
  mitraVerify: 'mitra:verify',
  umkmProductTakedown: 'umkm:product:takedown',
  aiAssist: 'ai:assist',
  aiExecutive: 'ai:executive',
} as const;

export function can(user: User | null, permission: string): boolean {
  return user?.permissions?.includes(permission) ?? false;
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
  categoryId?: string;
  discountPrice?: number | string | null;
  minStock?: number;
  unit?: string;
  sku?: string | null;
  isPreOrderAllowed?: boolean;
  preOrderAvailableAt?: string | null;
}

export interface StaffProductInput {
  name: string;
  description: string;
  categoryId: string;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
  sku?: string;
  discountPrice?: number;
  isActive: boolean;
  isPreOrderAllowed: boolean;
  preOrderAvailableAt?: string;
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

  /// Komponen uang tersimpan terpisah di backend sejak migration
  /// `20260917000000_order_money_components_...`. Pesanan lama memakai
  /// subtotal 0; di situ rinciannya disembunyikan, bukan ditampilkan Rp0.
  subtotal?: number | string;
  shippingFee?: number | string;
  discountAmount?: number | string;

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

  /** Hanya dikirim pada daftar sisi staf (`GET /admin/orders`). */
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string | null;
  } | null;
}

/** Metadata paginasi yang dikirim backend pada daftar berhalaman. */
export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

// ── Marketplace (GET /marketplace/products) ──

export type MarketplaceSellerType = 'all' | 'kopdes' | 'umkm';
export type MarketplaceSort =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'rating'
  | 'distance';

export interface MarketplaceProduct {
  id: string;
  name: string;
  price: number | string;
  discountPrice?: number | string | null;
  stock: number;
  unit?: string;
  sellerType: 'KOPDES' | 'UMKM';
  sellerName: string;
  imageUrl?: string | null;
  rating?: number | null;
  reviewCount?: number;
  distanceLabel?: string | null;
}

export interface MarketplaceFilter {
  search?: string;
  categoryId?: string | null;
  sellerType?: MarketplaceSellerType;
  sort?: MarketplaceSort;
  minPrice?: number | null;
  maxPrice?: number | null;
  inStock?: boolean;
}

export interface Category {
  id: string;
  name: string;
  group: 'FOOD' | 'RETAIL';
}

// ── Dashboard staf (GET /admin/dashboard/*) ──

export interface DashboardSummary {
  newOrders: number;
  needProcessing: number;
  readyToShip: number;
  lowStockProducts: number;
}

export interface StockSummary {
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
}

export interface FinanceSummary {
  period: 'today' | 'week' | 'month';
  grossSales: string;
  transactionCount: number;
  refundTotal: string;
  codTotal: string;
  qrisTotal: string;
  changePercent: number | null;
  itemsSubtotal?: string;
  discountTotal?: string | null;
  shippingTotal?: string | null;
}

export interface StoreStatus {
  kopdesId: string;
  name: string;
  village: string;
  logoUrl?: string | null;
  isActive: boolean;
  /** Null berarti jadwal operasional belum diatur — bukan "tutup". */
  isOpen: boolean | null;
  opensAt?: string | null;
  closesAt?: string | null;
}

export interface StaffTodayOrder {
  id: string;
  reference: string;
  customerName: string;
  itemCount: number;
  totalAmount: string;
  status: string;
  createdAt: string;
  thumbnailUrl?: string | null;
  deliveryId?: string | null;
  courierAssigned: boolean;
}

export interface StockItem {
  id: string;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
  sku?: string | null;
  price: string;
}

export interface InventoryTransaction {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason?: string | null;
  createdAt: string;
  product?: { id: string; name: string } | null;
  umkmProduct?: { id: string; name: string } | null;
  user?: { id: string; name: string } | null;
}

// ── Kurir & pengantaran (GET/PATCH /admin/*) ──

export interface Courier {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  /** Pengantaran yang masih berjalan; dipakai untuk membagi beban. */
  activeCount: number;
}

export type DeliveryStatusWire =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'COURIER_DELIVERED'
  | 'CUSTOMER_CONFIRMED'
  | 'COMPLETED';

export interface AdminDelivery {
  id: string;
  status: DeliveryStatusWire;
  createdAt: string;
  courier?: { id: string; name: string; phone?: string | null } | null;
  order?: {
    id: string;
    orderNumber?: string | null;
    customer?: { id: string; name: string; phone?: string | null } | null;
    deliveryAddress?: {
      street: string;
      city: string;
      state: string;
    } | null;
  } | null;
}

// ── Ulasan (GET/POST /reviews) ──

export interface Review {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  user?: { id: string; name: string };
}

export interface ReviewableItem {
  productId?: string | null;
  umkmProductId?: string | null;
  name: string;
}

// ── Alamat pengiriman (GET/POST/PUT/DELETE /addresses) ──

export interface Address {
  id: string;
  title: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

export interface CreateAddressInput {
  title: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
}

/** Satu langkah pada timeline pesanan (GET /orders/:id/timeline). */
export interface TimelineEntry {
  action: string;
  details?: string | null;
  createdAt: string;
}

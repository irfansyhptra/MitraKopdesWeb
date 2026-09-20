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
  kopdesPolicyManage: 'kopdes:policy:manage',
  /** Mengelola akun pegawai di Kopdes sendiri — hanya Admin Kopdes. */
  staffManage: 'staff:manage',
  userManage: 'user:manage',
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

/**
 * Nilai-nilai ini kembar persis dengan `MarketplaceQueryDto` di backend.
 *
 * Sebelumnya klien memakai kosakatanya sendiri — 'all' huruf kecil dan
 * 'relevance' yang tidak pernah ada di server — sehingga setiap permintaan
 * katalog dijawab 400 dan beranda tampil kosong tanpa pesan apa pun.
 * Menyamakan kosakatanya menghapus tabel terjemahan yang bisa melenceng lagi.
 */
export type MarketplaceSellerType = 'ALL' | 'KOPDES' | 'UMKM';
export type MarketplaceSort =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'distance';

/** Ringkasan ulasan; backend mengirimnya sebagai objek, bukan satu angka. */
export interface RatingSummary {
  /** Null berarti belum ada ulasan — bukan nol bintang. */
  average: number | null;
  count: number;
}

/**
 * Satu baris katalog.
 *
 * Bentuknya mengikuti `MergedProduct` di backend. Catatan yang mudah
 * terlewat: di sana namanya `source`, bukan `sellerType` — klien
 * memetakannya sekali di `getMarketplaceProducts`, bukan di tiap layar.
 */
export interface MarketplaceProduct {
  id: string;
  name: string;
  price: number | string;
  stock: number;
  sellerType: 'KOPDES' | 'UMKM';
  sellerId?: string | null;
  sellerName: string;
  imageUrl?: string | null;
  categoryId?: string;
  categoryName?: string | null;
  rating: RatingSummary;
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

// ── Pembayaran (Midtrans Core API) ──

/**
 * Metode yang benar-benar didukung backend dan aktif di akun merchant.
 *
 * Nilainya kembar dengan `PAYMENT_METHODS` di backend. Metode yang belum
 * terintegrasi sengaja tidak ada di sini — pilihan yang pasti gagal saat
 * ditekan lebih buruk daripada pilihan yang tidak ditawarkan.
 */
export type PaymentMethodCode =
  | 'QRIS'
  | 'GOPAY'
  | 'SHOPEEPAY'
  | 'BCA_VA'
  | 'BNI_VA'
  | 'BRI_VA'
  | 'PERMATA_VA'
  | 'MANDIRI_BILL';

/** Status yang dibaca pembeli; lebih halus daripada enum PaymentStatus. */
export type PaymentView =
  | 'PENDING'
  | 'PAID'
  | 'DENIED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED'
  | 'REFUNDED';

export interface PaymentAction {
  name: string;
  method: string;
  url: string;
}

/**
 * Bentuk yang sama untuk semua metode.
 *
 * Backend yang menormalkan respons Midtrans — QRIS lewat `actions`, VA bank
 * lewat `va_numbers`, Permata lewat field tersendiri, Mandiri lewat
 * `bill_key`. Layar hanya membaca field yang relevan bagi metodenya.
 */
export interface PaymentSnapshot {
  orderId: string;
  method: PaymentMethodCode | string;
  status: PaymentView;
  midtransOrderId: string | null;
  transactionId: string | null;
  paymentType: string | null;
  transactionStatus: string | null;
  fraudStatus: string | null;
  grossAmount: number;
  /** ISO dari server. Hitung mundur memakai ini, bukan waktu buatan klien. */
  expiryTime: string | null;
  vaNumber: string | null;
  bank: string | null;
  billKey: string | null;
  billerCode: string | null;
  qrCodeUrl: string | null;
  deeplinkUrl: string | null;
  actions: PaymentAction[];
  paidAt: string | null;
}

// ── Pengajuan koperasi & pemantauan (Super Admin) ──

export type KopdesApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface KopdesApplication {
  id: string;
  kopdesName: string;
  description?: string | null;
  address: string;
  village: string;
  district: string;
  city: string;
  province: string;
  postalCode?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes?: string | null;
  status: KopdesApplicationStatus;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  kopdesId?: string | null;
  createdAt: string;
}

export interface SubmitApplicationInput {
  kopdesName: string;
  description?: string;
  address: string;
  village: string;
  district: string;
  city: string;
  province: string;
  postalCode?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes?: string;
}

/**
 * Hasil persetujuan. `initialPassword` hanya ada di respons ini — setelah
 * halaman ditutup tidak ada cara membacanya lagi.
 */
export interface ApprovalResult {
  kopdes: { id: string; name: string };
  admin: { id: string; email: string; name: string };
  initialPassword: string;
}

/**
 * Pembuatan koperasi langsung. Koordinat wajib: tidak ada langkah kedua
 * yang bisa melengkapinya nanti, dan tanpa itu koperasinya tidak pernah
 * muncul di pencarian terdekat.
 */
export interface CreateKopdesDirectInput {
  kopdesName: string;
  description?: string;
  address: string;
  village: string;
  district: string;
  city: string;
  province: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  contactName: string;
  /** Sekaligus username-nya: sistem ini masuk dengan email. */
  contactEmail: string;
  contactPhone: string;
  /**
   * Kata sandi awal. Dikosongkan berarti sistem membuatkannya.
   *
   * Apa pun asalnya, nilainya hanya muncul sekali pada respons pembuatan —
   * yang tersimpan di server hanya hash-nya.
   */
  initialPassword?: string;
}

/** Jumlah per koperasi — hanya jumlah, tanpa rincian transaksi apa pun. */
export interface KopdesStats {
  id: string;
  name: string;
  village: string;
  district: string;
  city: string;
  province: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  counts: {
    products: number;
    orders: number;
    staff: number;
    umkms: number;
  };
}

export interface SuperAdminOverview {
  totalUsers: number;
  usersByRole?: Record<string, number> | { role: string; count: number }[];
  totalOrders: number;
  totalMitra?: number;
  pendingMitra?: number;
}

// ── Akun pegawai (GET/POST/PATCH/DELETE /admin/staff) ──

export interface PermissionInfo {
  key: string;
  /** Label yang dibaca pengurus koperasi, bukan nama teknisnya. */
  label: string;
  group: string;
  description: string;
}

export interface PermissionCatalog {
  assignable: string[];
  items: PermissionInfo[];
}

export interface StaffAccount {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  kopdesId: string | null;
  /** Kolom mentah. Kosong berarti "pakai bawaan peran", bukan tanpa wewenang. */
  permissions: string[];
  /** Izin yang benar-benar berlaku, sudah dihitung backend. */
  effectivePermissions: string[];
  usesRoleDefaults: boolean;
  createdAt: string;
}

/** Peran yang boleh diangkat Admin Kopdes. Cerminan ASSIGNABLE_ROLES. */
export type AssignableRole = 'PEGAWAI_KOPDES' | 'COURIER';

export interface CreatePegawaiInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  /** Dikosongkan berarti pegawai. */
  role?: AssignableRole;
  /** Diabaikan backend bila perannya kurir. */
  permissions?: string[];
}

export interface UpdatePegawaiInput {
  name?: string;
  phone?: string;
  password?: string;
  permissions?: string[];
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

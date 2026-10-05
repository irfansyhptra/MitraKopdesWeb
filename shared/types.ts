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
  avatarUrl?: string | null;
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
  umkmLocationUpdate: 'umkm:location:update',
  aiAssist: 'ai:assist',
  aiExecutive: 'ai:executive',
  kopdesPolicyManage: 'kopdes:policy:manage',
  /** Memverifikasi pendaftaran anggota koperasi — hanya Admin Kopdes. */
  memberManage: 'member:manage',
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

export interface EmailVerificationChallenge {
  verificationRequired: true;
  email: string;
  /** Detik sampai kode kedaluwarsa. */
  expiresIn: number;
  /** Detik sebelum tombol kirim ulang aktif. */
  resendAfter: number;
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

export type PaymentMethod = PaymentMethodCode | 'COD' | 'WALLET';

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

// ── Kopdes (GET /koperasi, /koperasi/nearby, /koperasi/:id) ──

/**
 * Satu Koperasi Desa. Bentuknya mengikuti `CARD_SELECT` di
 * `koperasi.service.ts`, ditambah tiga field turunan yang dihitung server:
 * `distanceMeters`/`distanceLabel` (hanya pada endpoint terdekat) dan
 * `isOpen` (dari jam operasional).
 */
export interface Koperasi {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  imageUrl?: string | null;
  address: string;
  village: string;
  district: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  serviceCategories: string[];
  isVerified: boolean;
  /** Jarak selalu dari server; jarak kiriman klien tidak pernah dipercaya. */
  distanceMeters?: number | null;
  distanceLabel?: string | null;
  /** `null` berarti jam operasional belum diisi — bukan "tutup". */
  isOpen?: boolean | null;
  rating: RatingSummary;

  /**
   * Jam operasional per hari: `{ "mon": { "open": "07:00", "close": "17:00" },
   * "sun": null }`. Hari yang null atau tidak ada berarti tutup.
   */
  operatingHours?: Record<string, { open: string; close: string } | null> | null;
}

export interface KoperasiDetail extends Koperasi {
  postalCode?: string | null;
  productCount: number;
  umkmCount: number;
  /** Hanya anggota berstatus ACTIVE; pendaftar yang menunggu belum dihitung. */
  memberCount: number;
}

// ── Mitra UMKM ──

/** Nilainya kembar dengan enum `UMKMCategory` di backend. */
export type MitraCategory =
  | 'KULINER'
  | 'SWALAYAN'
  | 'MINUMAN'
  | 'KERAJINAN'
  | 'JASA'
  | 'LAINNYA';

export interface Mitra {
  id: string;
  userId?: string;
  businessName: string;
  description?: string | null;
  address: string;
  phone?: string | null;
  photoUrl?: string | null;
  category: MitraCategory;
  kopdesId?: string | null;
  kopdes?: { id: string; name: string; village: string } | null;
  latitude?: number | null;
  longitude?: number | null;
  /** `null` berarti jam operasional belum diisi — bukan "tutup". */
  isOpen?: boolean | null;
  productCount?: number;
  rating: RatingSummary;
  distanceLabel?: string | null;
}

// ── Keanggotaan Kopdes ──

export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED';

export interface Membership {
  id: string;
  kopdesId: string;
  status: MembershipStatus;
  fullName: string;
  phone: string;
  address: string;
  note?: string | null;
  /** Alasan penolakan, atau catatan pengurus saat menyetujui. */
  reviewNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  /** Hanya pada daftar pengurus; pemohon tidak melihat data akun orang lain. */
  user?: { id: string; name: string; email: string };
}

export interface UpdateKopdesProfileInput {
  description?: string;
  phone?: string;
  serviceCategories?: string[];
  operatingHours?: Record<string, { open: string; close: string } | null>;
}

export interface ApplyMembershipInput {
  fullName: string;
  phone: string;
  address: string;
  note?: string;
}

/** Radius dibatasi 50 km di backend (`MAX_RADIUS_KM`). */
export interface NearbyQuery {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  search?: string;
  openNow?: boolean;
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

  /**
   * Harga setelah diskon — yang dibayar pembeli.
   *
   * Backend menolak `discountPrice >= price` (`assertPricing` di
   * `product.service.ts`), jadi `price` selalu harga normalnya dan yang
   * dicoret di kartu adalah `price`, bukan ini. Hanya produk Kopdes yang
   * punya kolom ini; produk mitra selalu null.
   */
  discountPrice?: number | null;
}

export interface MarketplaceFilter {
  search?: string;
  categoryId?: string | null;
  sellerType?: MarketplaceSellerType;
  sort?: MarketplaceSort;
  minPrice?: number | null;
  maxPrice?: number | null;
  inStock?: boolean;
  /** Hanya produk berdiskon. Produk mitra ikut tersaring keluar di server. */
  discounted?: boolean;
  /** Satu koperasi saja: barangnya sendiri dan barang mitra di bawahnya. */
  kopdesId?: string;
  /** Satu etalase UMKM saja; sama dengan filter Flutter StoreRef. */
  umkmId?: string;
  /** Rating rata-rata minimum; 0 berarti tanpa batas bawah. */
  minRating?: number;

  /**
   * Koordinat pembuka halaman, hanya untuk `sort: 'distance'`.
   *
   * Server menolak pengurutan jarak tanpa koordinat yang sah (400), jadi
   * keduanya wajib ada sebelum urutan itu dipakai — bukan dikirim
   * sendirian dan dibiarkan gagal.
   */
  latitude?: number;
  longitude?: number;
}

/** Iklan beranda/marketplace dari `GET /banners`. */
export interface Banner {
  id: string;
  badge?: string | null;
  title: string;
  highlight?: string | null;
  description?: string | null;
  ctaLabel?: string | null;
  ctaRoute?: string | null;
  imageUrl?: string | null;
}

/** Produk ringkas untuk seksi pilihan dan terlaris di beranda. */
export interface DiscoveryProduct {
  id: string;
  name: string;
  price: number | string;
  stock: number;
  imageUrl?: string | null;
  sellerName: string;
  /** Endpoint discovery memakai KOPERASI, berbeda dari katalog yang memakai KOPDES. */
  source: 'KOPERASI' | 'UMKM';
  soldCount?: number;
  rank?: number;
}

export interface Category {
  id: string;
  name: string;
  group: 'FOOD' | 'RETAIL';
  description?: string | null;
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

// ── Pembayaran (Midtrans Snap) ──

/**
 * Metode yang benar-benar didukung backend dan aktif di akun merchant.
 *
 * Nilainya kembar dengan `PAYMENT_METHODS` di backend. Metode yang belum
 * terintegrasi sengaja tidak ada di sini — pilihan yang pasti gagal saat
 * ditekan lebih buruk daripada pilihan yang tidak ditawarkan.
 */
export type PaymentMethodCode =
  | 'MIDTRANS'
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

/** Sesi pembayaran Snap dan status yang sudah disahkan webhook. */
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
  /** Token publik untuk membuka popup Snap. Server Key tidak pernah dikirim. */
  snapToken: string | null;
  snapRedirectUrl: string | null;
  snapClientKey: string | null;
  snapScriptUrl: string;
  snapEnvironment: 'sandbox';
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

export interface SuperAdminUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  kopdesId?: string | null;
  permissions?: string[];
  createdAt: string;
}

export interface CreateSuperStaffInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'ADMIN_KOPDES' | 'PEGAWAI_KOPDES';
  kopdesId?: string;
  permissions?: string[];
}

export interface UpdateSuperStaffInput {
  name?: string;
  phone?: string;
  password?: string;
  role?: 'ADMIN_KOPDES' | 'PEGAWAI_KOPDES';
  kopdesId?: string;
  permissions?: string[];
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

export interface AdminMitra {
  id: string;
  businessName: string;
  description?: string | null;
  address: string;
  phone?: string | null;
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | string;
  rejectionReason?: string | null;
  verifiedAt?: string | null;
  productCount: number;
  latitude?: number | null;
  longitude?: number | null;
  category?: string;
  user?: { id: string; name: string; email: string; phone?: string | null };
}

export interface AdminUmkmProduct {
  id: string;
  name: string;
  price: number | string;
  stock: number;
  isActive: boolean;
  isApproved: boolean;
  rejectionReason?: string | null;
  umkm?: { id: string; businessName: string };
  images?: ProductImage[];
}

// ── Portal penjual UMKM (GET/PUT /seller/*) ──

export interface SellerStore {
  id: string;
  businessName: string;
  description?: string | null;
  address: string;
  phone?: string | null;
  photoUrl?: string | null;
  bannerUrl?: string | null;
  status: string;
  verifiedAt?: string | null;
}

export interface SellerProduct extends Product {
  categoryId: string;
  isApproved: boolean;
  rating: number;
}

export interface SellerActivity {
  type: 'ORDER' | 'REVIEW' | 'STOCK_WARN' | string;
  title: string;
  description: string;
  timestamp: string;
}

export interface SellerDashboard {
  storeInfo: SellerStore;
  stats: {
    totalProducts: number;
    totalOrders: number;
    productsSold: number;
    todayEarnings: number;
    todayOrders: number;
    monthlyEarnings: number;
    monthlyOrders: number;
    storeRating: number;
    lowStockCount: number;
    newOrdersCount: number;
  };
  lowStockProducts: SellerProduct[];
  recentActivities: SellerActivity[];
}

export interface SellerProductPage {
  products: SellerProduct[];
  meta: PageMeta;
  summary: { total?: number; safe: number; low: number; out: number };
  lowStockThreshold: number;
}

export interface SellerProductInput {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  isActive?: boolean;
}

export interface SellerOrder extends Order {
  customerId: string;
  customer: {
    id: string;
    name: string;
    email?: string;
    phone?: string | null;
  };
  deliveryAddress: {
    recipientName?: string;
    phone?: string;
    street: string;
    city: string;
    state: string;
    postalCode?: string;
  };
  delivery?: {
    id?: string;
    courier?: { id: string; name: string; phone?: string | null } | null;
  } | null;
}

// Respons `/courier/deliveries` memuat item pesanan dan lokasi terakhir.
export interface CourierDelivery extends AdminDelivery {
  order?: (NonNullable<AdminDelivery['order']> & {
    totalAmount?: number | string;
    paymentMethod?: string;
    paymentStatus?: string;
    items?: Array<{
      id: string;
      quantity: number;
      product?: { name: string } | null;
      umkmProduct?: { name: string } | null;
    }>;
  }) | null;
  locations?: Array<{
    latitude: number;
    longitude: number;
    recordedAt: string;
  }>;
}

export type ChatChannel = 'MARKETPLACE' | 'DELIVERY' | 'GENERAL';

export interface ChatConversation {
  id: string;
  lastMessageAt: string;
  otherUser: { id: string; name: string; role: Role; email?: string };
  lastMessage?: { id: string; content: string; createdAt: string } | null;
  unreadCount: number;
  channel: ChatChannel;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt?: string | null;
  sender?: { id: string; name: string; role: Role; email?: string };
}

export interface ContentPage {
  slug: string;
  title: string;
  subtitle?: string | null;
  sections: unknown;
  footnote?: string | null;
  updatedAt: string;
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

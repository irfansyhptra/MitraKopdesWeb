// Klien API framework-agnostic untuk KOPDES.
// Dipakai landing (produk publik) maupun app (auth + dashboard + belanja).
//
// Catatan envelope backend TIDAK konsisten:
//   - kebanyakan: { success, data }
//   - cart:       { success, cart }
//   - order:      { success, order }
//   - history:    { success, orders }
// Karena itu ada `pick()` untuk mengambil key yang tepat.

import type {
  Address,
  AuthResult,
  Cart,
  CreateAddressInput,
  Category,
  DashboardSummary,
  FinanceSummary,
  MarketplaceFilter,
  MarketplaceProduct,
  Order,
  PageMeta,
  PaymentMethod,
  Product,
  ProductListResult,
  Review,
  ReviewableItem,
  StaffTodayOrder,
  StockItem,
  StockSummary,
  StoreStatus,
  TimelineEntry,
  User,
  AdminDelivery,
  Courier,
  DeliveryStatusWire,
  InventoryTransaction,
  UploadSignature,
  ApprovalResult,
  CreateKopdesDirectInput,
  KopdesApplication,
  KopdesApplicationStatus,
  KopdesStats,
  SubmitApplicationInput,
  SuperAdminOverview,
  CreatePegawaiInput,
  PermissionCatalog,
  StaffAccount,
  UpdatePegawaiInput,
  StaffProductInput,
} from './types';

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Respons JSON backend apa adanya; bentuk tiap endpoint dibaca lewat `pick()`. */
type JsonBody = Record<string, unknown> | null;

export function createApiClient({ baseUrl, getToken }: ApiClientOptions) {
  async function rawRequest(
    path: string,
    init: RequestInit = {},
  ): Promise<JsonBody> {
    const token = getToken?.();
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    const body: JsonBody = await res.json().catch(() => null);
    if (!res.ok) {
      // Nest mengirim `message` sebagai string atau array string; apa pun
      // selain itu bukan pesan yang layak ditampilkan ke pemakai.
      const raw = body?.message ?? body?.error;
      const text = Array.isArray(raw)
        ? raw.join(', ')
        : typeof raw === 'string'
          ? raw
          : '';
      // Pesan kosong tetap jatuh ke teks umum: dialog error tanpa kalimat
      // sama saja dengan tidak memberi tahu apa yang gagal.
      throw new ApiError(text.trim() || `Request gagal (${res.status})`, res.status);
    }
    return body;
  }

  // Ambil field tertentu dari envelope (default 'data').
  function pick<T>(body: JsonBody, key = 'data'): T {
    return (body?.[key] ?? body) as T;
  }

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    return pick<T>(await rawRequest(path, init));
  }

  const toQuery = (params?: Record<string, string | number>) =>
    params
      ? '?' +
        new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';

  return {
    rawRequest,
    request,

    // ── Produk (publik) ──
    getProducts: (params?: Record<string, string | number>) =>
      request<ProductListResult>(`/products${toQuery(params)}`),
    getProduct: (id: string) => request<Product>(`/products/${id}`),
    /**
     * Tanda tangan unggahan Cloudinary.
     *
     * Rahasianya tinggal di backend; yang datang ke peramban hanya tanda
     * tangan untuk satu unggahan. Endpoint-nya dijaga permission, jadi
     * pelanggan biasa tidak bisa memakai kuota Cloudinary koperasi sebagai
     * penyimpanan gratis.
     */
    getUploadSignature: () =>
      request<UploadSignature>('/uploads/signature'),

    /**
     * Menyimpan barang. Gambar dikirim sebagai URL, bukan berkas.
     *
     * Berkasnya sudah diunggah klien langsung ke Cloudinary lebih dulu —
     * melewatkannya lewat server akan menabrak batas badan permintaan 4,5 MB
     * pada fungsi serverless Vercel, dan satu foto ponsel sering
     * melampauinya.
     */
    saveStaffProduct: (payload: StaffProductInput, id?: string) =>
      request<Product>(
        id ? `/products/${encodeURIComponent(id)}` : '/products',
        { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) },
      ),

    // ── Keranjang (butuh autentikasi) ──
    getCart: async () => pick<Cart>(await rawRequest('/cart'), 'cart'),
    addToCart: async (productId: string, quantity: number) =>
      pick<Cart>(
        await rawRequest('/cart/add', {
          method: 'POST',
          body: JSON.stringify({ productId, quantity }),
        }),
        'cart',
      ),
    updateCartItem: async (
      ref: { productId?: string; umkmProductId?: string },
      quantity: number,
    ) =>
      pick<Cart>(
        await rawRequest('/cart/update', {
          method: 'PUT',
          body: JSON.stringify({ ...ref, quantity }),
        }),
        'cart',
      ),
    removeCartItem: async (ref: {
      productId?: string;
      umkmProductId?: string;
    }) => {
      const qs = new URLSearchParams(
        Object.entries(ref).filter(([, v]) => v) as [string, string][],
      ).toString();
      return pick<Cart>(
        await rawRequest(`/cart/remove?${qs}`, { method: 'DELETE' }),
        'cart',
      );
    },
    clearCart: async () =>
      pick<Cart>(await rawRequest('/cart/clear', { method: 'DELETE' }), 'cart'),

    // ── Pesanan ──
    /**
     * Checkout.
     *
     * `cartItemIds` adalah baris yang dicentang pemesan; yang tidak disebut
     * tetap tinggal di keranjang. Nominal sengaja tidak dikirim dari klien —
     * backend menghitung sendiri subtotal, ongkir, dan diskon.
     */
    checkout: async (payload: {
      paymentMethod: PaymentMethod;
      deliveryAddressId?: string;
      cartItemIds?: string[];
    }) =>
      pick<Order>(
        await rawRequest('/orders/checkout', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
        'order',
      ),
    /**
     * Riwayat pesanan berhalaman.
     *
     * `meta` wajib dibaca: tanpa itu klien tidak pernah tahu masih ada
     * halaman berikutnya, dan tab "Selesai" berhenti di 10 pesanan pertama
     * tanpa penjelasan.
     */
    getOrderHistory: async (page = 1, limit = 10) => {
      const body = await rawRequest(
        `/orders/history${toQuery({ page, limit })}`,
      );
      return {
        items: (body?.orders ?? []) as Order[],
        meta: (body?.meta ?? {
          total: 0,
          page,
          limit,
          totalPages: 1,
        }) as PageMeta,
      };
    },
    getOrder: async (id: string) =>
      pick<Order>(await rawRequest(`/orders/${id}`), 'order'),

    // ── Auth ──
    login: (email: string, password: string) =>
      request<AuthResult>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (payload: {
      email: string;
      password: string;
      name: string;
      phone?: string;
      role: 'CUSTOMER' | 'UMKM' | 'COURIER';
    }) =>
      request<AuthResult>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    me: () => request<User>('/auth/me'),

    // ── Alamat pengiriman ──
    getAddresses: () => request<Address[]>('/addresses'),
    createAddress: (payload: CreateAddressInput) =>
      request<Address>('/addresses', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    deleteAddress: (id: string) =>
      request<{ id: string }>(`/addresses/${id}`, { method: 'DELETE' }),

    // ── Pesanan: timeline & penerimaan ──
    getOrderTimeline: async (id: string) => {
      const body = await rawRequest(`/orders/${id}/timeline`);
      return (body?.data ?? body?.timeline ?? []) as TimelineEntry[];
    },
    confirmReceipt: (id: string) =>
      request<Order>(`/orders/${id}/confirm-receipt`, { method: 'POST' }),

    // ── Marketplace (publik) ──
    // Filter dikirim ke server, bukan disaring di browser: menyaring satu
    // halaman secara lokal memberi hasil salah begitu katalognya lebih
    // panjang daripada satu halaman.
    getMarketplaceProducts: async (
      filter: MarketplaceFilter = {},
      page = 1,
      limit = 20,
    ) => {
      const body = await rawRequest(
        `/marketplace/products${toQuery({
          page,
          limit,
          sellerType: filter.sellerType ?? 'all',
          sort: filter.sort ?? 'relevance',
          ...(filter.search ? { search: filter.search } : {}),
          ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
          ...(filter.minPrice != null ? { minPrice: filter.minPrice } : {}),
          ...(filter.maxPrice != null ? { maxPrice: filter.maxPrice } : {}),
          ...(filter.inStock ? { inStock: 'true' } : {}),
        })}`,
      );
      const data = (body?.data ?? body ?? {}) as Record<string, unknown>;
      return {
        items: (data.products ?? []) as MarketplaceProduct[],
        meta: {
          total: data.total ?? 0,
          page: data.page ?? page,
          limit: data.limit ?? limit,
          totalPages: data.totalPages ?? 1,
        } as PageMeta,
      };
    },
    getCategories: () => request<Category[]>('/categories'),
    /// Detail produk Mitra UMKM — endpoint terpisah dari produk Kopdes.
    getUmkmProduct: (id: string) =>
      request<Record<string, unknown>>(`/umkm/products/${id}`),

    // ── Ulasan ──
    getReviews: async (
      ref: { productId?: string; umkmProductId?: string },
      page = 1,
      limit = 10,
    ) => {
      const body = await rawRequest(
        `/reviews${toQuery({ ...ref, page, limit })}`,
      );
      return {
        items: (body?.items ?? []) as Review[],
        averageRating: (body?.averageRating ?? null) as number | null,
        meta: (body?.meta ?? {
          total: 0,
          page,
          limit,
          totalPages: 1,
        }) as PageMeta,
      };
    },
    getReviewableItems: async (orderId: string) => {
      const body = await rawRequest(`/reviews/reviewable/${orderId}`);
      return (body?.items ?? []) as ReviewableItem[];
    },
    submitReview: (payload: {
      orderId: string;
      productId?: string | null;
      umkmProductId?: string | null;
      rating: number;
      comment?: string;
    }) =>
      request<Review>('/reviews', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    // ── Asisten AI ──
    // Hanya `/ai/chat`. Endpoint AI yang lain (`/ai/management`,
    // `/ai/inventory`, `/ai/anomaly`) dijaga peran staf, jadi memanggilnya
    // dari halaman pelanggan hanya menghasilkan 403. Versi Flutter memilih
    // endpoint dengan mencocokkan kata pada kalimat pengguna — pemilihan itu
    // milik backend, bukan klien.
    aiChat: async (message: string) => {
      const body = await rawRequest('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      const text = body?.response ?? body?.data;
      return typeof text === 'string' ? text : '';
    },

    // ── Dashboard staf Kopdes ──
    // Satu endpoint per bagian: kalau rekap keuangan gagal, kartu pesanan
    // dan stok tetap tampil.
    getStaffSummary: () =>
      request<DashboardSummary>('/admin/dashboard/summary'),
    getStaffTodayOrders: (limit = 3) =>
      request<StaffTodayOrder[]>(
        `/admin/dashboard/today-orders${toQuery({ limit })}`,
      ),
    getStaffStockSummary: () =>
      request<StockSummary>('/admin/dashboard/stock-summary'),
    getStaffFinance: (period: 'today' | 'week' | 'month' = 'today') =>
      request<FinanceSummary>(`/admin/dashboard/finance${toQuery({ period })}`),
    getStaffStoreStatus: () =>
      request<StoreStatus | null>('/admin/dashboard/store-status'),
    getStaffPermissions: () =>
      request<{ role: string; kopdesId: string | null; permissions: string[] }>(
        '/admin/dashboard/me',
      ),

    // ── Stok ──
    getStockList: async (
      filter: 'all' | 'low' | 'out' = 'all',
      page = 1,
      limit = 20,
    ) => {
      const body = await rawRequest(
        `/admin/inventory/products${toQuery({ filter, page, limit })}`,
      );
      return {
        items: (body?.items ?? []) as StockItem[],
        meta: (body?.meta ?? {
          total: 0,
          page,
          limit,
          totalPages: 1,
        }) as PageMeta,
      };
    },

    // ── Pesanan sisi staf ──
    getAdminOrders: async (
      status: string | undefined,
      page = 1,
      limit = 20,
    ) => {
      const body = await rawRequest(
        `/admin/orders${toQuery({ page, limit, ...(status ? { status } : {}) })}`,
      );
      return {
        items: (body?.data ?? []) as Order[],
        meta: (body?.meta ?? {
          total: 0,
          page,
          limit,
          totalPages: 1,
        }) as PageMeta,
      };
    },
    updateAdminOrderStatus: (id: string, status: string) =>
      request<Order>(`/admin/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),

    // ── Mutasi & penyesuaian stok ──
    getStockTransactions: async (page = 1, limit = 20) => {
      const body = await rawRequest(
        `/admin/inventory/transactions${toQuery({ page, limit })}`,
      );
      return {
        items: (body?.items ?? body?.data ?? []) as InventoryTransaction[],
        meta: (body?.meta ?? {
          total: 0,
          page,
          limit,
          totalPages: 1,
        }) as PageMeta,
      };
    },
    adjustStock: (payload: {
      productId?: string;
      umkmProductId?: string;
      type: 'IN' | 'OUT' | 'ADJUSTMENT';
      quantity: number;
      reason: string;
    }) =>
      request<unknown>('/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    stockOpname: (payload: {
      productId?: string;
      umkmProductId?: string;
      countedStock: number;
      reason?: string;
    }) =>
      request<unknown>('/admin/inventory/opname', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    // ── Kurir & pengantaran ──
    getCouriers: () => request<Courier[]>('/admin/couriers'),
    getDeliveries: (status?: DeliveryStatusWire) =>
      request<AdminDelivery[]>(
        `/admin/deliveries${status ? toQuery({ status }) : ''}`,
      ),
    assignCourier: (deliveryId: string, courierId: string) =>
      request<AdminDelivery>(`/admin/deliveries/${deliveryId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ courierId }),
      }),
    unassignCourier: (deliveryId: string) =>
      request<AdminDelivery>(`/admin/deliveries/${deliveryId}/unassign`, {
        method: 'PATCH',
      }),

    // ── Akun pegawai (Admin Kopdes) ──
    // Lingkupnya satu desa dan satu peran; backend yang menentukan
    // keduanya, klien tidak pernah mengirim role maupun kopdesId.
    getPermissionCatalog: () =>
      request<PermissionCatalog>('/admin/staff/permissions'),
    getStaffAccounts: () => request<StaffAccount[]>('/admin/staff'),
    createPegawai: (payload: CreatePegawaiInput) =>
      request<StaffAccount>('/admin/staff', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updatePegawai: (id: string, payload: UpdatePegawaiInput) =>
      request<StaffAccount>(`/admin/staff/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    deletePegawai: (id: string) =>
      request<{ success: boolean }>(`/admin/staff/${id}`, {
        method: 'DELETE',
      }),

    // ── Pengajuan koperasi (publik) ──
    // Tanpa token: koperasi yang belum bergabung belum punya akun.
    submitKopdesApplication: (payload: SubmitApplicationInput) =>
      request<{ id: string; kopdesName: string; createdAt: string }>(
        '/kopdes-applications',
        { method: 'POST', body: JSON.stringify(payload) },
      ),

    // ── Super Admin ──
    getSuperAdminOverview: () =>
      request<SuperAdminOverview>('/super-admin/overview'),
    getApplications: (status?: KopdesApplicationStatus) =>
      request<KopdesApplication[]>(
        `/super-admin/applications${status ? toQuery({ status }) : ''}`,
      ),
    getApplicationCounts: () =>
      request<Record<KopdesApplicationStatus, number>>(
        '/super-admin/applications/counts',
      ),
    approveApplication: (
      id: string,
      payload: {
        latitude: number;
        longitude: number;
        reviewNote?: string;
        /** Dikosongkan berarti sistem membuatkannya. Muncul sekali saja. */
        initialPassword?: string;
      },
    ) =>
      request<ApprovalResult>(`/super-admin/applications/${id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    rejectApplication: (id: string, reviewNote: string) =>
      request<KopdesApplication>(`/super-admin/applications/${id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewNote }),
      }),
    /** Hanya jumlah per koperasi; backend tidak menyediakan rinciannya. */
    getKopdesStats: () => request<KopdesStats[]>('/super-admin/kopdes'),
    /**
     * Membuat koperasi tanpa melewati formulir pengajuan — untuk permintaan
     * yang datang langsung. Mengembalikan kata sandi awal satu kali, sama
     * seperti jalur persetujuan.
     */
    createKopdesDirect: (payload: CreateKopdesDirectInput) =>
      request<ApprovalResult>('/super-admin/kopdes', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    // ── Asisten AI staf ──
    // Endpoint terpisah dari `/ai/chat` dan dijaga `ai:assist`.
    aiManagement: async (message: string) => {
      const body = await rawRequest('/ai/management', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      const text = body?.response ?? body?.data;
      return typeof text === 'string' ? text : '';
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export type {
  Address,
  ApiResponse,
  AuthResult,
  Cart,
  CreateAddressInput,
  CartItem,
  Category,
  DashboardSummary,
  FinanceSummary,
  MarketplaceFilter,
  MarketplaceProduct,
  MarketplaceSellerType,
  MarketplaceSort,
  Order,
  PageMeta,
  Paginated,
  PaymentMethod,
  Product,
  ProductListResult,
  Review,
  ReviewableItem,
  Role,
  StaffTodayOrder,
  StockItem,
  StockSummary,
  StoreStatus,
  TimelineEntry,
  User,
  AdminDelivery,
  Courier,
  DeliveryStatusWire,
  InventoryTransaction,
  CreatePegawaiInput,
  PermissionCatalog,
  PermissionInfo,
  StaffAccount,
  UpdatePegawaiInput,
  ApprovalResult,
  CreateKopdesDirectInput,
  KopdesApplication,
  KopdesApplicationStatus,
  KopdesStats,
  SubmitApplicationInput,
  SuperAdminOverview,
  UploadSignature,
} from './types';
export { Permissions, can } from './types';

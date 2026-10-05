// Klien API framework-agnostic untuk KOPDES.
// Dipakai landing (produk publik) maupun app (auth + dashboard + belanja).
//
// Catatan envelope backend TIDAK konsisten:
//   - kebanyakan: { success, data }
//   - cart:       { success, cart }
//   - order:      { success, order }
//   - history:    { success, orders }
//   - alamat:     { success, addresses } dan { success, address }
// Karena itu ada `pick()` untuk mengambil key yang tepat.

import type {
  Mitra,
  UpdateKopdesProfileInput,
  MembershipStatus,
  Membership,
  ApplyMembershipInput,
  Banner,
  DiscoveryProduct,
  Address,
  AuthResult,
  EmailVerificationChallenge,
  Cart,
  CreateAddressInput,
  Category,
  DashboardSummary,
  FinanceSummary,
  Koperasi,
  KoperasiDetail,
  MarketplaceFilter,
  MarketplaceProduct,
  NearbyQuery,
  Order,
  PageMeta,
  Paginated,
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
  PaymentSnapshot,
  ApprovalResult,
  CreateKopdesDirectInput,
  KopdesApplication,
  KopdesApplicationStatus,
  KopdesStats,
  SubmitApplicationInput,
  SuperAdminOverview,
  SuperAdminUser,
  CreateSuperStaffInput,
  UpdateSuperStaffInput,
  CreatePegawaiInput,
  PermissionCatalog,
  StaffAccount,
  UpdatePegawaiInput,
  StaffProductInput,
  SellerDashboard,
  SellerProduct,
  SellerProductInput,
  SellerProductPage,
  SellerOrder,
  SellerStore,
  CourierDelivery,
  AdminMitra,
  AdminUmkmProduct,
  ChatChannel,
  ChatConversation,
  ChatMessage,
  ContentPage,
} from './types';

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null;
  /**
   * Menyegarkan sesi setelah backend menjawab 401.
   *
   * Mengembalikan true bila token baru berhasil didapat, sehingga
   * permintaannya layak diulang. Disediakan aplikasi, bukan di sini: klien
   * ini juga dipakai landing yang tidak punya sesi sama sekali.
   */
  refreshAuth?: () => Promise<boolean>;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Satu baris katalog seperti yang benar-benar dikirim backend
 * (`MergedProduct` di `marketplace.service.ts`).
 *
 * Ditulis terpisah dari `MarketplaceProduct` supaya perbedaannya kelihatan:
 * di kawat namanya `source`, dan `rating` adalah objek, bukan angka.
 */
interface WireProduct {
  id: string;
  name: string;
  price: number | string;
  stock: number;
  imageUrl?: string | null;
  categoryId?: string;
  categoryName?: string | null;
  sellerId?: string | null;
  sellerName?: string | null;
  source?: 'KOPDES' | 'UMKM';
  rating?: { average: number | null; count: number } | null;
  distanceLabel?: string | null;
  discountPrice?: number | string | null;
}

function toMarketplaceProduct(p: WireProduct): MarketplaceProduct {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    // Produk tanpa `source` diperlakukan sebagai milik Kopdes: itu jalur
    // yang benar untuk endpoint produk biasa, dan menebak UMKM akan
    // mengirim pembeli ke detail yang tidak ada.
    sellerType: p.source ?? 'KOPDES',
    sellerId: p.sellerId ?? null,
    sellerName: p.sellerName ?? 'Kopdes',
    imageUrl: p.imageUrl ?? null,
    categoryId: p.categoryId,
    categoryName: p.categoryName ?? null,
    // Null berarti belum ada ulasan — bukan nol bintang.
    rating: p.rating ?? { average: null, count: 0 },
    distanceLabel: p.distanceLabel ?? null,
    discountPrice: p.discountPrice == null ? null : Number(p.discountPrice),
  };
}

/** Respons JSON backend apa adanya; bentuk tiap endpoint dibaca lewat `pick()`. */
type JsonBody = Record<string, unknown> | null;

/**
 * Jalur yang tidak boleh memicu penyegaran sesi.
 *
 * `/auth/refresh` yang menjawab 401 berarti refresh token-nya sendiri sudah
 * mati — menyegarkan lagi hanya menghasilkan lingkaran. Login dan register
 * menjawab 401 untuk kredensial yang salah, bukan untuk sesi kedaluwarsa.
 */
const NO_REFRESH = ['/auth/refresh', '/auth/login', '/auth/register'];

export function createApiClient({
  baseUrl,
  getToken,
  refreshAuth,
}: ApiClientOptions) {
  async function rawRequest(
    path: string,
    init: RequestInit = {},
    retried = false,
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

    /**
     * Access token kedaluwarsa → segarkan sekali, lalu ulangi.
     *
     * Sekali saja: 401 yang tetap datang setelah token baru berarti
     * permintaannya memang ditolak, bukan sesinya yang basi, dan mengulang
     * terus hanya membuat lingkaran yang tidak pernah selesai.
     *
     * Badan FormData tidak bisa dikirim ulang — aliran berkasnya sudah
     * habis terbaca pada percobaan pertama.
     */
    if (
      res.status === 401 &&
      !retried &&
      refreshAuth &&
      !NO_REFRESH.some((p) => path.startsWith(p)) &&
      !(init.body instanceof FormData)
    ) {
      const refreshed = await refreshAuth();
      if (refreshed) return rawRequest(path, init, true);
    }

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

  /**
   * Memastikan yang dikembalikan benar-benar daftar.
   *
   * Envelope backend berbeda-beda, dan kunci yang meleset membuat `pick()`
   * mengembalikan objek envelope alih-alih arraynya. Layar yang memanggil
   * `.map` atau `.find` pada objek itu melempar dan menjatuhkan seluruh
   * halaman — kegagalan yang jauh lebih besar daripada daftar kosong.
   */
  function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
  }

  /**
   * Ambil field tertentu dari envelope (default 'data').
   *
   * Memeriksa keberadaan kuncinya, bukan `??`: `{ success: true, data: null }`
   * adalah jawaban yang sah — "belum pernah mendaftar" pada status
   * keanggotaan, misalnya — dan dengan `??` seluruh envelope yang dikembalikan,
   * sehingga pemanggilnya menerima objek tanpa field yang ia cari alih-alih
   * `null` yang jelas.
   */
  function pick<T>(body: JsonBody, key = 'data'): T {
    return (body && key in body ? body[key] : body) as T;
  }

  /**
   * Backend menamai larik hasilnya `koperasi`, bukan `items`, dan menaruh
   * metadata paginasi sejajar dengannya. Dipetakan sekali di sini supaya
   * setiap layar membaca bentuk `Paginated` yang sama seperti katalog.
   */
  function koperasiPage(
    body: JsonBody,
    page: number,
    limit: number,
  ): Paginated<Koperasi> {
    const data = (body?.data ?? body ?? {}) as Record<string, unknown>;
    return {
      items: asArray<Koperasi>(data.koperasi),
      meta: {
        total: Number(data.total ?? 0),
        page: Number(data.page ?? page),
        limit: Number(data.limit ?? limit),
        totalPages: Number(data.totalPages ?? 1),
      },
    };
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
     * Menyimpan barang beserta gambarnya.
     *
     * Berkas dikirim ke backend sebagai multipart; backend yang mengunggah
     * ke Cloudinary. `Content-Type` sengaja tidak dipasang saat body berupa
     * FormData — peramban harus menuliskannya sendiri lengkap dengan
     * boundary, dan menimpanya membuat backend gagal mengurai.
     */
    saveStaffProduct: (
      payload: StaffProductInput,
      images: File[] = [],
      id?: string,
    ) => {
      let body: BodyInit = JSON.stringify(payload);
      if (images.length) {
        const form = new FormData();
        for (const [key, value] of Object.entries(payload)) {
          // `false` harus tetap terkirim: yang hilang membuat barang
          // nonaktif diam-diam tayang.
          if (value !== undefined) form.append(key, String(value));
        }
        for (const file of images) form.append('images', file);
        body = form;
      }
      return request<Product>(
        id ? `/products/${encodeURIComponent(id)}` : '/products',
        { method: id ? 'PUT' : 'POST', body },
      );
    },

    // ── Keranjang (butuh autentikasi) ──
    getCart: async () => pick<Cart>(await rawRequest('/cart'), 'cart'),
    /**
     * Menambah barang ke keranjang.
     *
     * Menerima `ref`, bukan satu id telanjang. Produk Kopdes dan produk
     * Mitra UMKM tinggal di dua tabel berbeda, dan mengirim id produk UMKM
     * sebagai `productId` membuat backend mencarinya di tabel Product lalu
     * menjawab 404 — itulah sebabnya barang mitra tidak pernah masuk
     * keranjang. Bentuknya disamakan dengan `updateCartItem` yang sejak awal
     * sudah membedakan keduanya.
     */
    addToCart: async (
      ref: { productId?: string; umkmProductId?: string },
      quantity: number,
    ) =>
      pick<Cart>(
        await rawRequest('/cart/add', {
          method: 'POST',
          body: JSON.stringify({ ...ref, quantity }),
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
    /**
     * Pendaftaran mandiri hanya membuat akun pembeli — tidak ada `role` di
     * payload. Backend menolak peran lain pada endpoint ini, jadi field yang
     * pasti ditolak hanya membuat form gagal dengan alasan yang membingungkan.
     */
    register: (payload: {
      email: string;
      password: string;
      name: string;
      phone?: string;
    }) =>
      request<EmailVerificationChallenge>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    verifyCustomerEmail: (email: string, code: string) =>
      request<AuthResult>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      }),
    resendCustomerEmailOtp: (email: string) =>
      request<EmailVerificationChallenge>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    me: () => request<User>('/auth/me'),
    updateMyProfile: (payload: { name: string; phone?: string }) =>
      request<User>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    updateAvatar: (avatar: File) => {
      const form = new FormData();
      form.append('avatar', avatar);
      return request<User>('/auth/profile/avatar', {
        method: 'PUT',
        body: form,
      });
    },

    // ── Alamat pengiriman ──
    //
    // Envelope-nya BUKAN `data`: daftar memakai `addresses`, penyimpanan
    // memakai `address`. Membacanya sebagai `data` membuat `pick()` jatuh ke
    // seluruh objek envelope, lalu `addresses.find(...)` di halaman checkout
    // melempar "find is not a function" dan seluruh halaman gagal dimuat.
    getAddresses: async () =>
      asArray<Address>(pick(await rawRequest('/addresses'), 'addresses')),
    createAddress: async (payload: CreateAddressInput) =>
      pick<Address>(
        await rawRequest('/addresses', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),
        'address',
      ),
    deleteAddress: (id: string) =>
      request<{ id: string }>(`/addresses/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),

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
          sellerType: filter.sellerType ?? 'ALL',
          sort: filter.sort ?? 'newest',
          ...(filter.search ? { search: filter.search } : {}),
          ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
          ...(filter.kopdesId ? { kopdesId: filter.kopdesId } : {}),
          ...(filter.umkmId ? { umkmId: filter.umkmId } : {}),
          ...(filter.minPrice != null ? { minPrice: filter.minPrice } : {}),
          ...(filter.maxPrice != null ? { maxPrice: filter.maxPrice } : {}),
          ...(filter.inStock ? { inStock: 'true' } : {}),
          ...(filter.discounted ? { discounted: 'true' } : {}),
          ...(filter.minRating ? { minRating: filter.minRating } : {}),
          // Koordinat hanya berarti bersama sort=distance; server memakainya
          // untuk menghitung jarak dan menolak urutan itu tanpa keduanya.
          ...(filter.sort === 'distance' &&
          filter.latitude != null &&
          filter.longitude != null
            ? { latitude: filter.latitude, longitude: filter.longitude }
            : {}),
        })}`,
      );
      const data = (body?.data ?? body ?? {}) as Record<string, unknown>;
      return {
        // Backend menamai jenis penjualnya `source`; seluruh layar memakai
        // `sellerType`. Pemetaannya sekali di sini, bukan di tiap kartu —
        // satu layar yang lupa melakukannya akan menautkan produk mitra ke
        // halaman produk Kopdes dan berakhir 404.
        items: ((data.products ?? []) as WireProduct[]).map(toMarketplaceProduct),
        meta: {
          total: data.total ?? 0,
          page: data.page ?? page,
          limit: data.limit ?? limit,
          totalPages: data.totalPages ?? 1,
        } as PageMeta,
      };
    },
    // ── Kopdes (publik) ──
    // Dua endpoint, satu bentuk hasil: `/koperasi/nearby` butuh koordinat dan
    // menyertakan jarak, `/koperasi` dipakai saat izin lokasi tidak ada.
    getNearbyKoperasi: async (query: NearbyQuery, page = 1, limit = 10) =>
      koperasiPage(
        await rawRequest(
          `/koperasi/nearby${toQuery({
            latitude: query.latitude,
            longitude: query.longitude,
            radius: query.radiusKm ?? 10,
            page,
            limit,
            ...(query.search ? { search: query.search } : {}),
            ...(query.openNow ? { openNow: 'true' } : {}),
          })}`,
        ),
        page,
        limit,
      ),
    getKoperasiList: async (search = '', page = 1, limit = 10) =>
      koperasiPage(
        await rawRequest(
          `/koperasi${toQuery({ page, limit, ...(search ? { search } : {}) })}`,
        ),
        page,
        limit,
      ),
    /// Mitra UMKM di bawah satu koperasi. Tanpa `kopdesId`, seluruh mitra
    /// aktif — penyaringannya di server, bukan di browser.
    getMitraList: async (kopdesId?: string, page = 1, limit = 20) => {
      const body = await rawRequest(
        `/umkm${toQuery({ page, limit, ...(kopdesId ? { kopdesId } : {}) })}`,
      );
      const data = (body?.data ?? body ?? {}) as Record<string, unknown>;
      return {
        items: asArray<Mitra>(data.umkm),
        meta: {
          total: Number(data.total ?? 0),
          page: Number(data.page ?? page),
          limit: Number(data.limit ?? limit),
          totalPages: Number(data.totalPages ?? 1),
        },
      } satisfies Paginated<Mitra>;
    },
    getMitra: (id: string) =>
      request<Mitra>(`/umkm/${encodeURIComponent(id)}`),
    getNearbyMitra: async (query: NearbyQuery, page = 1, limit = 10) => {
      const body = await rawRequest(
        `/umkm/nearby${toQuery({
          latitude: query.latitude,
          longitude: query.longitude,
          radius: query.radiusKm ?? 10,
          page,
          limit,
          ...(query.search ? { search: query.search } : {}),
          ...(query.openNow ? { openNow: 'true' } : {}),
        })}`,
      );
      const data = (body?.data ?? body ?? {}) as Record<string, unknown>;
      return {
        items: asArray<Mitra>(data.umkm),
        meta: {
          total: Number(data.total ?? 0),
          page: Number(data.page ?? page),
          limit: Number(data.limit ?? limit),
          totalPages: Number(data.totalPages ?? 1),
        },
      } satisfies Paginated<Mitra>;
    },
    getKoperasi: (id: string) =>
      request<KoperasiDetail>(`/koperasi/${encodeURIComponent(id)}`),

    // ── Keanggotaan Kopdes (butuh autentikasi) ──
    // `null` berarti belum pernah mendaftar — dibedakan dari ditolak, yang
    // punya alasannya sendiri untuk ditampilkan.
    getMembership: (kopdesId: string) =>
      request<Membership | null>(
        `/koperasi/${encodeURIComponent(kopdesId)}/members/me`,
      ),
    applyMembership: (kopdesId: string, payload: ApplyMembershipInput) =>
      request<Membership>(`/koperasi/${encodeURIComponent(kopdesId)}/members`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    // ── Verifikasi anggota (pengurus koperasi) ──
    getMembers: async (status?: MembershipStatus) => {
      const body = await rawRequest(
        `/admin/members${status ? `?status=${status}` : ''}`,
      );
      const data = (body?.data ?? body ?? {}) as Record<string, unknown>;
      return asArray<Membership>(data.members);
    },
    updateKopdesProfile: (payload: UpdateKopdesProfileInput) =>
      request<Koperasi>('/admin/kopdes/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    updateKopdesMedia: (media: { logo?: File; banner?: File }) => {
      const form = new FormData();
      if (media.logo) form.append('logo', media.logo);
      if (media.banner) form.append('banner', media.banner);
      return request<Koperasi>('/admin/kopdes/profile/media', {
        method: 'PUT',
        body: form,
      });
    },
    getMemberCounts: () =>
      request<Record<MembershipStatus, number>>('/admin/members/counts'),
    reviewMembership: (
      id: string,
      status: 'ACTIVE' | 'REJECTED',
      reviewNote?: string,
    ) =>
      request<Membership>(`/admin/members/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(reviewNote ? { reviewNote } : {}) }),
      }),

    getCategories: () => request<Category[]>('/categories'),
    createCategory: (name: string, description?: string) =>
      request<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify({ name, ...(description ? { description } : {}) }),
      }),
    /// Iklan utama. Gagal memuatnya tidak boleh menghentikan katalog, jadi
    /// pemanggilnya yang memutuskan cadangannya.
    getBanners: async () => {
      const body = await rawRequest('/banners');
      const data = (body?.data ?? body ?? {}) as Record<string, unknown>;
      return asArray<Banner>(data.banners);
    },
    getBestSellers: async (limit = 8, period: '7d' | '30d' | 'all' = '30d') => {
      const body = await rawRequest(
        `/products/best-sellers${toQuery({ limit, period })}`,
      );
      const data = (body?.data ?? body ?? {}) as Record<string, unknown>;
      return asArray<DiscoveryProduct>(data.products);
    },
    getFeaturedUmkmProducts: async (limit = 8) => {
      const body = await rawRequest(
        `/umkm/products/featured${toQuery({ limit })}`,
      );
      const data = (body?.data ?? body ?? {}) as Record<string, unknown>;
      return asArray<DiscoveryProduct>(data.products);
    },
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

    // ── Pembayaran ──
    // Yang dikirim hanya id pesanan. Kanal pembayaran dipilih di Snap;
    // nominal, diskon, dan total
    // dihitung ulang backend dari database; mengirimnya dari sini berarti
    // mengirim angka yang bisa diubah siapa pun lewat DevTools.
    createPayment: (orderId: string) =>
      request<PaymentSnapshot>('/payments/create', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      }),
    getPayment: (orderId: string) =>
      request<PaymentSnapshot>(`/payments/${encodeURIComponent(orderId)}`),
    /** Membaca status terakhir yang sudah disahkan webhook Midtrans. */
    checkPaymentStatus: (orderId: string) =>
      request<PaymentSnapshot>(
        `/payments/${encodeURIComponent(orderId)}/check-status`,
        { method: 'POST' },
      ),

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
    getSuperAdminAccounts: () =>
      request<SuperAdminUser[]>('/super-admin/accounts'),
    createSuperAdminAccount: (payload: CreateSuperStaffInput) =>
      request<SuperAdminUser>('/super-admin/accounts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateSuperAdminAccount: (id: string, payload: UpdateSuperStaffInput) =>
      request<SuperAdminUser>(`/super-admin/accounts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    deleteSuperAdminAccount: (id: string) =>
      request<{ success: boolean }>(`/super-admin/accounts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
    getSuperAdminUsers: (filters: { role?: string; search?: string } = {}) =>
      request<SuperAdminUser[]>(`/super-admin/users${toQuery(filters)}`),

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

    // ── Portal penjual UMKM ──
    // Jalurnya sama persis dengan service Flutter di `features/umkm/data`.
    getSellerDashboard: () => request<SellerDashboard>('/seller/dashboard'),
    getSellerStatistics: () => request<Array<Record<string, unknown>>>('/seller/statistics'),
    getSellerProfile: () => request<SellerStore>('/seller/profile'),
    updateSellerProfile: (payload: Pick<SellerStore, 'businessName' | 'description' | 'address' | 'phone'>) =>
      request<SellerStore>('/seller/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    updateSellerMedia: (media: { logo?: File; banner?: File }) => {
      const form = new FormData();
      if (media.logo) form.append('logo', media.logo);
      if (media.banner) form.append('banner', media.banner);
      return request<SellerStore>('/seller/profile/media', {
        method: 'PUT',
        body: form,
      });
    },
    getSellerProducts: async (params: {
      search?: string;
      categoryId?: string;
      stockStatus?: 'safe' | 'low' | 'out';
      page?: number;
      limit?: number;
    } = {}) => {
      const body = await rawRequest(`/seller/products${toQuery({
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        ...(params.search ? { search: params.search } : {}),
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params.stockStatus ? { stockStatus: params.stockStatus } : {}),
      })}`);
      const data = (body?.data ?? body ?? {}) as Record<string, unknown>;
      const meta = (data.meta ?? {
        total: data.total ?? 0,
        page: data.page ?? params.page ?? 1,
        limit: data.limit ?? params.limit ?? 20,
        totalPages: data.totalPages ?? 1,
      }) as PageMeta;
      return {
        products: asArray<SellerProduct>(data.products),
        meta,
        summary: (data.summary ?? { safe: 0, low: 0, out: 0 }) as SellerProductPage['summary'],
        lowStockThreshold: Number(data.lowStockThreshold ?? 5),
      } satisfies SellerProductPage;
    },
    getSellerProduct: (id: string) =>
      request<SellerProduct>(`/seller/products/${encodeURIComponent(id)}`),
    getSellerProductCategories: () =>
      request<Array<Category & { productCount?: number }>>('/seller/products/categories'),
    saveSellerProduct: (
      payload: SellerProductInput,
      images: File[] = [],
      id?: string,
    ) => {
      const form = new FormData();
      for (const [key, value] of Object.entries(payload)) {
        if (value !== undefined) form.append(key, String(value));
      }
      images.forEach((file) => form.append('images', file));
      return request<SellerProduct>(
        id ? `/seller/products/${encodeURIComponent(id)}` : '/seller/products',
        { method: id ? 'PUT' : 'POST', body: form },
      );
    },
    updateSellerProduct: (id: string, payload: Partial<SellerProductInput>) => {
      const form = new FormData();
      for (const [key, value] of Object.entries(payload)) {
        if (value !== undefined) form.append(key, String(value));
      }
      return request<SellerProduct>(`/seller/products/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: form,
      });
    },
    deleteSellerProduct: (id: string) =>
      rawRequest(`/seller/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    adjustSellerStock: (productId: string, delta: number, reason: string) =>
      request<{ currentStock: number }>('/seller/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          umkmProductId: productId,
          type: delta > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(delta),
          reason,
        }),
      }),
    getSellerOrders: () => request<SellerOrder[]>('/seller/orders'),
    getSellerOrder: (id: string) =>
      request<SellerOrder>(`/seller/orders/${encodeURIComponent(id)}`),
    updateSellerOrderStatus: (id: string, status: string) =>
      request<SellerOrder>(`/seller/orders/${encodeURIComponent(id)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),

    // ── Portal kurir ──
    getCourierDeliveries: () =>
      request<CourierDelivery[]>('/courier/deliveries'),
    markCourierDelivered: (id: string) =>
      request<CourierDelivery>(`/courier/deliveries/${encodeURIComponent(id)}/mark-delivered`, {
        method: 'PATCH',
      }),
    updateCourierLocation: (id: string, latitude: number, longitude: number) =>
      request<CourierDelivery>(`/courier/deliveries/${encodeURIComponent(id)}/location`, {
        method: 'POST',
        body: JSON.stringify({ latitude, longitude }),
      }),

    // ── Moderasi Admin Kopdes ──
    getAdminMitra: (status?: string, search?: string) =>
      request<AdminMitra[]>(`/admin/umkm${toQuery({
        ...(status ? { status } : {}),
        ...(search ? { search } : {}),
      })}`),
    verifyAdminMitra: (id: string, status: string, rejectionReason?: string) =>
      request<AdminMitra>(`/admin/umkm/${encodeURIComponent(id)}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(rejectionReason ? { rejectionReason } : {}) }),
      }),
    updateAdminMitraLocation: (id: string, latitude: number, longitude: number, category?: string) =>
      request<AdminMitra>(`/admin/umkm/${encodeURIComponent(id)}/location`, {
        method: 'PATCH',
        body: JSON.stringify({ latitude, longitude, ...(category ? { category } : {}) }),
      }),
    getAdminUmkmProducts: (search?: string) =>
      request<AdminUmkmProduct[]>(`/admin/umkm/products${toQuery({
        ...(search ? { search } : {}),
      })}`),
    setAdminUmkmProductActive: (id: string, isActive: boolean, reason?: string) =>
      request<AdminUmkmProduct>(`/admin/umkm/products/${encodeURIComponent(id)}/takedown`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive, ...(reason ? { reason } : {}) }),
      }),

    // ── Konten & chat lintas peran ──
    getContentPage: (slug: string) =>
      request<ContentPage>(`/content/${encodeURIComponent(slug)}`),
    getConversations: (channel?: ChatChannel) =>
      request<ChatConversation[]>(`/chat/conversations${channel ? toQuery({ channel }) : ''}`),
    startConversation: (recipientId: string, channel?: ChatChannel) =>
      request<ChatConversation>('/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ recipientId, ...(channel ? { channel } : {}) }),
      }),
    startProductConversation: (productId: string, sellerType: 'KOPDES' | 'UMKM') =>
      request<ChatConversation>(
        `/chat/conversations/${sellerType === 'UMKM' ? 'umkm-product' : 'product'}/${encodeURIComponent(productId)}/seller`,
        { method: 'POST' },
      ),
    startSellerOrderConversation: (orderId: string, target: 'customer' | 'courier') =>
      request<ChatConversation>(`/chat/conversations/order/${encodeURIComponent(orderId)}/${target}`, {
        method: 'POST',
      }),
    getChatMessages: (conversationId: string) =>
      request<ChatMessage[]>(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`),
    sendChatMessage: (conversationId: string, content: string) =>
      request<ChatMessage>(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    markConversationRead: (conversationId: string) =>
      request<{ success: boolean }>(`/chat/conversations/${encodeURIComponent(conversationId)}/read`, {
        method: 'PATCH',
      }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export type {
  MitraCategory,
  Mitra,
  SellerDashboard,
  SellerProduct,
  SellerProductInput,
  SellerProductPage,
  SellerOrder,
  SellerStore,
  CourierDelivery,
  AdminMitra,
  AdminUmkmProduct,
  ChatChannel,
  ChatConversation,
  ChatMessage,
  ContentPage,
  UpdateKopdesProfileInput,
  MembershipStatus,
  Membership,
  ApplyMembershipInput,
  Banner,
  DiscoveryProduct,
  Address,
  AssignableRole,
  Koperasi,
  KoperasiDetail,
  NearbyQuery,
  PaymentAction,
  PaymentMethodCode,
  PaymentSnapshot,
  PaymentView,
  ApiResponse,
  AuthResult,
  EmailVerificationChallenge,
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
  RatingSummary,
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
  SuperAdminUser,
  CreateSuperStaffInput,
  UpdateSuperStaffInput,
} from './types';
export { Permissions, can } from './types';

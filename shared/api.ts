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
  ApiResponse,
  AuthResult,
  Cart,
  Order,
  PaymentMethod,
  Product,
  ProductListResult,
  User,
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

export function createApiClient({ baseUrl, getToken }: ApiClientOptions) {
  async function rawRequest(
    path: string,
    init: RequestInit = {},
  ): Promise<any> {
    const token = getToken?.();
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        (body && (body.message || body.error)) || `Request gagal (${res.status})`;
      throw new ApiError(Array.isArray(msg) ? msg.join(', ') : msg, res.status);
    }
    return body;
  }

  // Ambil field tertentu dari envelope (default 'data').
  function pick<T>(body: any, key = 'data'): T {
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
    checkout: async (deliveryAddressId: string, paymentMethod: PaymentMethod) =>
      pick<Order>(
        await rawRequest('/orders/checkout', {
          method: 'POST',
          body: JSON.stringify({ deliveryAddressId, paymentMethod }),
        }),
        'order',
      ),
    getOrderHistory: async () =>
      pick<Order[]>(await rawRequest('/orders/history'), 'orders'),
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
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

export type {
  ApiResponse,
  AuthResult,
  Cart,
  CartItem,
  Order,
  PaymentMethod,
  Product,
  ProductListResult,
  User,
} from './types';

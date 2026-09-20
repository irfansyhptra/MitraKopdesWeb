import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '@shared/api';

/**
 * Kontrak katalog dengan backend.
 *
 * Bug yang ditutup tes ini: klien mengirim `sellerType=all` dan
 * `sort=relevance`, sementara `MarketplaceQueryDto` hanya menerima
 * ALL/KOPDES/UMKM dan newest/price_asc/price_desc/distance. Setiap
 * permintaan dijawab 400, lalu `safe()` di beranda menelannya — jadi
 * halamannya tampil "Produk belum tersedia" padahal ada 26 barang di
 * database, tanpa satu pun pesan galat.
 *
 * Nilai-nilainya dikunci di sini supaya salah ketik berikutnya gagal saat
 * tes, bukan saat pengunjung membuka beranda.
 */

function withFetch(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

const client = () => createApiClient({ baseUrl: 'https://contoh.test/api/v1' });

const EMPTY = { success: true, data: { products: [], total: 0, page: 1, limit: 20, totalPages: 1 } };

function paramsOf(fetchMock: ReturnType<typeof withFetch>) {
  return new URL(String(fetchMock.mock.calls[0][0])).searchParams;
}

describe('parameter kueri', () => {
  it('bawaannya memakai kosakata backend, bukan huruf kecil', async () => {
    const fetchMock = withFetch(EMPTY);
    await client().getMarketplaceProducts();
    const q = paramsOf(fetchMock);
    expect(q.get('sellerType')).toBe('ALL');
    expect(q.get('sort')).toBe('newest');
  });

  it('meneruskan jenis penjual dan urutan apa adanya', async () => {
    const fetchMock = withFetch(EMPTY);
    await client().getMarketplaceProducts({ sellerType: 'UMKM', sort: 'price_asc' });
    const q = paramsOf(fetchMock);
    expect(q.get('sellerType')).toBe('UMKM');
    expect(q.get('sort')).toBe('price_asc');
  });

  it('filter kosong tidak ikut terkirim', async () => {
    const fetchMock = withFetch(EMPTY);
    await client().getMarketplaceProducts({ sellerType: 'ALL', sort: 'newest' });
    const q = paramsOf(fetchMock);
    // `categoryId=` kosong ditolak validator sebagai string kosong.
    expect(q.has('categoryId')).toBe(false);
    expect(q.has('search')).toBe(false);
  });
});

describe('pemetaan respons', () => {
  const wire = {
    success: true,
    data: {
      products: [
        {
          id: 'p1', name: 'Beras', price: '70000', stock: 4,
          imageUrl: 'https://x/a.png', categoryId: 'c1', categoryName: 'Sembako',
          sellerId: 's1', sellerName: 'Warung Bu Sari', source: 'UMKM',
          rating: { average: 4.5, count: 12 },
        },
      ],
      total: 1, page: 1, limit: 20, totalPages: 1,
    },
  };

  it('memetakan `source` menjadi `sellerType`', async () => {
    withFetch(wire);
    const res = await client().getMarketplaceProducts();
    // Tanpa pemetaan ini, kartu produk mitra menaut ke /product/[id] milik
    // Kopdes dan berakhir 404.
    expect(res.items[0].sellerType).toBe('UMKM');
  });

  it('rating tetap objek, bukan dipaksa jadi angka', async () => {
    withFetch(wire);
    const res = await client().getMarketplaceProducts();
    expect(res.items[0].rating).toEqual({ average: 4.5, count: 12 });
  });

  it('produk tanpa rating mendapat ringkasan kosong, bukan undefined', async () => {
    withFetch({
      success: true,
      data: {
        products: [{ id: 'p2', name: 'Gula', price: 15000, stock: 1 }],
        total: 1, page: 1, limit: 20, totalPages: 1,
      },
    });
    const res = await client().getMarketplaceProducts();
    // Layar membaca `rating.average`; undefined di sini melempar saat render.
    expect(res.items[0].rating).toEqual({ average: null, count: 0 });
  });

  it('produk tanpa `source` dianggap milik Kopdes', async () => {
    withFetch({
      success: true,
      data: {
        products: [{ id: 'p3', name: 'Teh', price: 5000, stock: 2 }],
        total: 1, page: 1, limit: 20, totalPages: 1,
      },
    });
    const res = await client().getMarketplaceProducts();
    expect(res.items[0].sellerType).toBe('KOPDES');
  });

  it('meta paginasi dibaca dari envelope data', async () => {
    withFetch({
      success: true,
      data: { products: [], total: 26, page: 2, limit: 8, totalPages: 4 },
    });
    const res = await client().getMarketplaceProducts({}, 2, 8);
    expect(res.meta).toEqual({ total: 26, page: 2, limit: 8, totalPages: 4 });
  });
});

/**
 * Parameter dari URL.
 *
 * Tautan lama memakai huruf kecil (`?sellerType=umkm`). Meneruskannya apa
 * adanya membuat backend menjawab 400 dan katalog tampil kosong — satu
 * bookmark cukup untuk mematahkan halamannya.
 */
describe('sellerType dari URL', () => {
  it('huruf kecil dari tautan lama tetap diterima', async () => {
    const { readSellerType } = await import('@/app/marketplace/readSellerType');
    expect(readSellerType('umkm')).toBe('UMKM');
    expect(readSellerType('kopdes')).toBe('KOPDES');
    expect(readSellerType('all')).toBe('ALL');
  });

  it('nilai asing jatuh ke ALL, bukan menggagalkan halaman', async () => {
    const { readSellerType } = await import('@/app/marketplace/readSellerType');
    expect(readSellerType('relevance')).toBe('ALL');
    expect(readSellerType('')).toBe('ALL');
    expect(readSellerType(null)).toBe('ALL');
    expect(readSellerType(undefined)).toBe('ALL');
  });
});

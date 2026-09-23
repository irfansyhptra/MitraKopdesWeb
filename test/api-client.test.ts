import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from '@shared/api';

/**
 * Bentuk pesan galat dari backend.
 *
 * Nest mengirim `message` sebagai string ATAU array string, dan beberapa
 * filter mengirim objek. Sebelum penjagaan ini, objek diteruskan apa adanya
 * ke `ApiError`, jadi yang dibaca pemakai di kolom galat adalah
 * "[object Object]".
 */

function withFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

const client = () => createApiClient({ baseUrl: 'https://contoh.test/api/v1' });

describe('pesan galat', () => {
  it('memakai `message` berupa string', async () => {
    withFetch(400, { message: 'Stok tidak mencukupi' });
    await expect(client().me()).rejects.toThrow('Stok tidak mencukupi');
  });

  it('menggabungkan `message` berupa array dari ValidationPipe', async () => {
    withFetch(400, { message: ['email harus diisi', 'password terlalu pendek'] });
    await expect(client().me()).rejects.toThrow(
      'email harus diisi, password terlalu pendek',
    );
  });

  it('tidak pernah menampilkan objek sebagai pesan', async () => {
    withFetch(500, { message: { code: 'P2002', target: ['email'] } });
    await expect(client().me()).rejects.toThrow('Request gagal (500)');
  });

  it('pesan kosong jatuh ke teks umum', async () => {
    // Dialog galat tanpa kalimat sama saja dengan tidak memberi tahu
    // apa yang gagal.
    withFetch(503, { message: '   ' });
    await expect(client().me()).rejects.toThrow('Request gagal (503)');
  });

  it('membawa status HTTP supaya pemanggil bisa membedakannya', async () => {
    withFetch(403, { message: 'Terlarang' });
    await expect(client().me()).rejects.toBeInstanceOf(ApiError);
    await client()
      .me()
      .catch((e: ApiError) => expect(e.status).toBe(403));
  });
});

describe('aiChat', () => {
  it('membaca `response` dari envelope backend', async () => {
    withFetch(200, { success: true, data: 'halo', response: 'halo' });
    await expect(client().aiChat('hai')).resolves.toBe('halo');
  });

  it('jatuh ke `data` bila `response` tidak ada', async () => {
    withFetch(200, { success: true, data: 'jawaban' });
    await expect(client().aiChat('hai')).resolves.toBe('jawaban');
  });

  it('mengembalikan string kosong bila jawabannya bukan teks', async () => {
    // Halaman memperlakukan string kosong sebagai "AI tidak menjawab" dan
    // menampilkan pesan yang bisa dibaca — bukan merender objek.
    withFetch(200, { success: true, data: { unexpected: true } });
    await expect(client().aiChat('hai')).resolves.toBe('');
  });

  it('mengirim pesan sebagai JSON ke /ai/chat', async () => {
    const fetchMock = withFetch(200, { response: 'oke' });
    await client().aiChat('produk termurah');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://contoh.test/api/v1/ai/chat');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ message: 'produk termurah' });
  });
});

describe('penyimpanan barang', () => {
  const product = {
    name: 'Beras', description: 'Beras 5 kg', categoryId: 'beras', price: 70000,
    stock: 10, minStock: 5, unit: 'pcs', isActive: false, isPreOrderAllowed: false,
  };

  it('tanpa gambar mengirim JSON biasa', async () => {
    const fetchMock = withFetch(201, { success: true, data: { id: 'p1' } });
    await client().saveStaffProduct(product);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://contoh.test/api/v1/products');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(product);
  });

  it('dengan gambar mengirim multipart dan membiarkan peramban menulis boundary', async () => {
    const fetchMock = withFetch(201, { success: true, data: { id: 'p1' } });
    const photo = new File(['image'], 'beras.png', { type: 'image/png' });
    await client().saveStaffProduct(product, [photo]);
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBeInstanceOf(FormData);
    // Menimpa Content-Type menghilangkan boundary, dan backend gagal mengurai.
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body.getAll('images')).toHaveLength(1);
  });

  it('flag bernilai false tetap terkirim di multipart', async () => {
    const fetchMock = withFetch(201, { success: true, data: { id: 'p1' } });
    const photo = new File(['image'], 'a.png', { type: 'image/png' });
    await client().saveStaffProduct(product, [photo]);
    const form = fetchMock.mock.calls[0][1].body as FormData;
    // `false` yang hilang membuat barang nonaktif diam-diam tayang.
    expect(form.get('isActive')).toBe('false');
    expect(form.get('isPreOrderAllowed')).toBe('false');
  });

  it('menyunting memakai PUT ke id barangnya', async () => {
    const fetchMock = withFetch(200, { success: true, data: { id: 'p1' } });
    await client().saveStaffProduct(product, [], 'p1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://contoh.test/api/v1/products/p1');
    expect(init.method).toBe('PUT');
  });
});

/**
 * Keranjang.
 *
 * Bug yang ditutup tes ini: `addToCart` dulu hanya menerima satu id dan
 * selalu mengirimnya sebagai `productId`. Produk Mitra UMKM tinggal di tabel
 * lain, jadi backend mencarinya di tabel Product dan menjawab 404 — barang
 * mitra tidak pernah bisa masuk keranjang, tanpa pesan yang menjelaskan
 * kenapa.
 */
describe('menambah ke keranjang', () => {
  it('produk Kopdes dikirim sebagai productId', async () => {
    const fetchMock = withFetch(200, { success: true, cart: { id: 'c1', items: [] } });
    await client().addToCart({ productId: 'p1' }, 2);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent).toEqual({ productId: 'p1', quantity: 2 });
  });

  it('produk mitra dikirim sebagai umkmProductId', async () => {
    const fetchMock = withFetch(200, { success: true, cart: { id: 'c1', items: [] } });
    await client().addToCart({ umkmProductId: 'u1' }, 1);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent).toEqual({ umkmProductId: 'u1', quantity: 1 });
    // Mengirim keduanya, atau mengirim id mitra sebagai productId, membuat
    // backend menjawab 404.
    expect(sent).not.toHaveProperty('productId');
  });

  it('membaca keranjang dari envelope `cart`, bukan `data`', async () => {
    // Envelope backend tidak konsisten: keranjang memakai kunci `cart`.
    withFetch(200, { success: true, cart: { id: 'c1', items: [{ id: 'i1' }] } });
    const cart = await client().addToCart({ productId: 'p1' }, 1);
    expect(cart.id).toBe('c1');
  });
});

/**
 * Envelope alamat.
 *
 * Bug yang ditutup tes ini: `/addresses` menjawab `{ success, addresses }`,
 * bukan `{ success, data }`. Klien membacanya sebagai `data`, jadi `pick()`
 * jatuh ke SELURUH objek envelope. Halaman checkout lalu memanggil
 * `addresses.find(...)` pada objek itu, melempar "find is not a function",
 * dan Next menampilkan "This page couldn't load" — seluruh checkout mati.
 */
describe('alamat pengiriman', () => {
  it('membaca daftar dari kunci `addresses`', async () => {
    withFetch(200, {
      success: true,
      addresses: [{ id: 'a1', title: 'Rumah' }],
    });
    const list = await client().getAddresses();
    expect(Array.isArray(list)).toBe(true);
    expect(list[0].id).toBe('a1');
  });

  it('envelope tak terduga menghasilkan daftar kosong, bukan lemparan', async () => {
    // Daftar kosong hanya menyembunyikan alamat; objek yang lolos ke layar
    // menjatuhkan seluruh halaman.
    withFetch(200, { success: true, sesuatuYangLain: [{ id: 'a1' }] });
    await expect(client().getAddresses()).resolves.toEqual([]);
  });

  it('daftar kosong tetap array', async () => {
    withFetch(200, { success: true, addresses: [] });
    await expect(client().getAddresses()).resolves.toEqual([]);
  });

  it('menyimpan alamat membaca kunci `address`', async () => {
    withFetch(201, {
      success: true,
      message: 'ok',
      address: { id: 'a9', title: 'Kantor' },
    });
    const saved = await client().createAddress({
      title: 'Kantor', recipientName: 'B', phone: '0812',
      street: 'Jl', city: 'BA', state: 'Aceh', postalCode: '23111',
    });
    expect(saved.id).toBe('a9');
  });
});

describe('envelope kosong', () => {
  it('`data: null` diteruskan sebagai null, bukan seluruh envelope', async () => {
    // Status keanggotaan yang belum ada dijawab `{ success: true, data: null }`.
    // Dengan `??`, pemanggilnya menerima `{ success, data }` — objek truthy
    // tanpa `status`, sehingga kartu keanggotaan tidak menggambar apa pun.
    withFetch(200, { success: true, data: null });
    await expect(client().getMembership('k1')).resolves.toBeNull();
  });

  it('jawaban tanpa envelope tetap diteruskan apa adanya', async () => {
    withFetch(200, { id: 'p1', name: 'Beras' });
    await expect(client().getProduct('p1')).resolves.toMatchObject({ id: 'p1' });
  });
});

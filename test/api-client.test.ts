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

  it('mengirim JSON, bukan multipart — berkas tidak lagi melewati server', async () => {
    const fetchMock = withFetch(201, { success: true, data: { id: 'p1' } });
    await client().saveStaffProduct({
      ...product,
      imageUrls: ['https://res.cloudinary.com/x/a.jpg'],
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://contoh.test/api/v1/products');
    expect(init.method).toBe('POST');
    expect(init.body).not.toBeInstanceOf(FormData);
    expect(JSON.parse(init.body).imageUrls).toEqual([
      'https://res.cloudinary.com/x/a.jpg',
    ]);
  });

  it('flag bernilai false tetap terkirim, bukan hilang', async () => {
    const fetchMock = withFetch(201, { success: true, data: { id: 'p1' } });
    await client().saveStaffProduct(product);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    // `false` yang hilang membuat barang nonaktif diam-diam tayang.
    expect(sent.isActive).toBe(false);
    expect(sent.isPreOrderAllowed).toBe(false);
  });

  it('menyunting memakai PUT ke id barangnya', async () => {
    const fetchMock = withFetch(200, { success: true, data: { id: 'p1' } });
    await client().saveStaffProduct(product, 'p1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://contoh.test/api/v1/products/p1');
    expect(init.method).toBe('PUT');
  });
});

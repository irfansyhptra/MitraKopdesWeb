import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '@shared/api';

/**
 * Penyegaran sesi otomatis.
 *
 * Access token backend berumur 15 menit, jadi 401 karena kedaluwarsa adalah
 * kejadian biasa — bukan tanda pengguna harus masuk lagi. Yang diuji di sini
 * adalah tiga hal yang mudah salah: kapan menyegarkan, kapan TIDAK, dan
 * bahwa permintaannya diulang dengan token baru.
 */

function responder(handler: (url: string, init: RequestInit) => unknown) {
  const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
    const r = handler(String(url), init) as { status: number; body?: unknown };
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.body ?? {},
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

const BASE = 'https://contoh.test/api/v1';

describe('coba ulang setelah 401', () => {
  it('menyegarkan sekali lalu mengulang dengan token baru', async () => {
    let token = 'lama';
    const refreshAuth = vi.fn(async () => {
      token = 'baru';
      return true;
    });

    const seen: string[] = [];
    const fetchMock = responder((url, init) => {
      const auth = (init.headers as Record<string, string>)?.Authorization;
      seen.push(auth);
      return auth === 'Bearer baru'
        ? { status: 200, body: { data: { id: 'u1' } } }
        : { status: 401, body: { message: 'expired' } };
    });

    const api = createApiClient({
      baseUrl: BASE,
      getToken: () => token,
      refreshAuth,
    });

    await expect(api.me()).resolves.toEqual({ id: 'u1' });
    expect(refreshAuth).toHaveBeenCalledTimes(1);
    expect(seen).toEqual(['Bearer lama', 'Bearer baru']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('hanya sekali — 401 kedua diteruskan sebagai galat', async () => {
    const refreshAuth = vi.fn(async () => true);
    const fetchMock = responder(() => ({ status: 401, body: { message: 'ditolak' } }));

    const api = createApiClient({ baseUrl: BASE, getToken: () => 't', refreshAuth });

    // Mengulang terus hanya membuat lingkaran yang tidak pernah selesai.
    await expect(api.me()).rejects.toThrow('ditolak');
    expect(refreshAuth).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('penyegaran yang gagal tidak mengulang permintaan', async () => {
    const refreshAuth = vi.fn(async () => false);
    const fetchMock = responder(() => ({ status: 401, body: { message: 'expired' } }));

    const api = createApiClient({ baseUrl: BASE, getToken: () => 't', refreshAuth });

    await expect(api.me()).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('kapan TIDAK menyegarkan', () => {
  it('login yang ditolak tidak memicu penyegaran', async () => {
    const refreshAuth = vi.fn(async () => true);
    responder(() => ({ status: 401, body: { message: 'Kredensial salah' } }));

    const api = createApiClient({ baseUrl: BASE, getToken: () => null, refreshAuth });

    // 401 di sini berarti sandinya salah, bukan sesinya basi.
    await expect(api.login('a@b.co', 'salah')).rejects.toThrow(/Kredensial salah/);
    expect(refreshAuth).not.toHaveBeenCalled();
  });

  it('galat selain 401 diteruskan apa adanya', async () => {
    const refreshAuth = vi.fn(async () => true);
    responder(() => ({ status: 403, body: { message: 'Terlarang' } }));

    const api = createApiClient({ baseUrl: BASE, getToken: () => 't', refreshAuth });

    await expect(api.me()).rejects.toThrow('Terlarang');
    expect(refreshAuth).not.toHaveBeenCalled();
  });

  it('unggahan multipart tidak diulang', async () => {
    const refreshAuth = vi.fn(async () => true);
    const fetchMock = responder(() => ({ status: 401, body: { message: 'expired' } }));

    const api = createApiClient({ baseUrl: BASE, getToken: () => 't', refreshAuth });
    const file = new File(['x'], 'a.png', { type: 'image/png' });

    // Aliran berkasnya sudah habis terbaca pada percobaan pertama; mengirim
    // ulang FormData yang sama menghasilkan badan kosong.
    await expect(
      api.saveStaffProduct(
        { name: 'A', description: 'B', categoryId: 'c', price: 1, stock: 1,
          minStock: 1, unit: 'pcs', isActive: true, isPreOrderAllowed: false },
        [file],
      ),
    ).rejects.toThrow();
    expect(refreshAuth).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('tanpa refreshAuth, 401 langsung menjadi galat', async () => {
    const fetchMock = responder(() => ({ status: 401, body: { message: 'expired' } }));
    const api = createApiClient({ baseUrl: BASE, getToken: () => 't' });

    await expect(api.me()).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('refreshSession', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('menyimpan KEDUA token baru, bukan hanya access token', async () => {
    window.localStorage.setItem('kopdes_refresh_token', 'r-lama');
    responder(() => ({
      status: 200,
      body: { data: { accessToken: 'a-baru', refreshToken: 'r-baru' } },
    }));

    const { refreshSession, getToken, getRefreshToken } = await import('@/lib/auth');
    await expect(refreshSession(BASE)).resolves.toBe(true);

    expect(getToken()).toBe('a-baru');
    // Backend merotasi refresh token; menyimpan yang lama membuat
    // penyegaran berikutnya memakai token yang sudah dibuang server.
    expect(getRefreshToken()).toBe('r-baru');
  });

  it('beberapa pemanggil sekaligus hanya memicu satu penyegaran', async () => {
    window.localStorage.setItem('kopdes_refresh_token', 'r-lama');
    const fetchMock = responder(() => ({
      status: 200,
      body: { data: { accessToken: 'a', refreshToken: 'r' } },
    }));

    const { refreshSession } = await import('@/lib/auth');
    const results = await Promise.all([
      refreshSession(BASE),
      refreshSession(BASE),
      refreshSession(BASE),
    ]);

    // Rotasi berarti penyegaran kedua memakai token yang sudah mati, dan
    // pengguna terlempar keluar padahal sesinya masih sah.
    expect(results).toEqual([true, true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('tanpa refresh token, tidak menyentuh jaringan', async () => {
    const fetchMock = responder(() => ({ status: 200 }));
    const { refreshSession } = await import('@/lib/auth');
    await expect(refreshSession(BASE)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refresh token yang ditolak membersihkan sesi', async () => {
    window.localStorage.setItem('kopdes_access_token', 'a-lama');
    window.localStorage.setItem('kopdes_refresh_token', 'r-mati');
    responder(() => ({ status: 401, body: { message: 'Invalid or expired refresh token' } }));

    const { refreshSession, getToken } = await import('@/lib/auth');
    await expect(refreshSession(BASE)).resolves.toBe(false);
    expect(getToken()).toBeNull();
  });

  it('jaringan putus TIDAK membersihkan sesi', async () => {
    window.localStorage.setItem('kopdes_access_token', 'a-lama');
    window.localStorage.setItem('kopdes_refresh_token', 'r-hidup');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const { refreshSession, getToken } = await import('@/lib/auth');
    await expect(refreshSession(BASE)).resolves.toBe(false);
    // Jaringan putus bukan berarti sesi habis; membuangnya akan memaksa
    // pengguna masuk lagi hanya karena sinyalnya sempat hilang.
    expect(getToken()).toBe('a-lama');
  });
});

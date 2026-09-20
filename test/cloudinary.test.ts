import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadImages, UploadError } from '@/lib/cloudinary';

const getSignature = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { getUploadSignature: getSignature } }));

/**
 * Unggahan gambar dari peramban.
 *
 * Yang dijaga: berkas tidak pernah melewati server kita, penolakan terjadi
 * sebelum satu byte pun terkirim, dan URL yang dikembalikan adalah yang
 * https — halaman https menolak memuat gambar http sebagai mixed content.
 */

const SIG = {
  cloudName: 'kopdes',
  apiKey: '123',
  timestamp: 1700000000,
  folder: 'kopdes/products',
  signature: 'abc',
};

function png(name = 'a.png', bytes = 100) {
  return new File([new Uint8Array(bytes)], name, { type: 'image/png' });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getSignature.mockReset();
  getSignature.mockResolvedValue(SIG);
  fetchMock = vi.fn(async () => {
    return {
      ok: true,
      json: async () => ({
        secure_url: 'https://res.cloudinary.com/kopdes/a.png',
        url: 'http://res.cloudinary.com/kopdes/a.png',
      }),
    } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('uploadImages', () => {
  it('tanpa berkas tidak meminta tanda tangan sama sekali', async () => {
    await expect(uploadImages([])).resolves.toEqual([]);
    expect(getSignature).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mengunggah langsung ke Cloudinary, bukan lewat server kita', async () => {
    await uploadImages([png()]);
    expect(getSignature).toHaveBeenCalledTimes(1);
    // Berkasnya hanya pernah menyentuh Cloudinary.
    const targets = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(targets).toEqual([
      'https://api.cloudinary.com/v1_1/kopdes/image/upload',
    ]);
  });

  it('satu tanda tangan dipakai untuk semua berkas sekaligus', async () => {
    await uploadImages([png('a.png'), png('b.png'), png('c.png')]);
    expect(getSignature).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('mengembalikan secure_url, bukan url http', async () => {
    const urls = await uploadImages([png()]);
    expect(urls).toEqual(['https://res.cloudinary.com/kopdes/a.png']);
  });

  it('menolak jenis berkas yang bukan gambar sebelum mengirim apa pun', async () => {
    const pdf = new File([new Uint8Array(10)], 'x.pdf', { type: 'application/pdf' });
    await expect(uploadImages([pdf])).rejects.toBeInstanceOf(UploadError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('menolak berkas di atas 10 MB sebelum mengirim apa pun', async () => {
    await expect(uploadImages([png('besar.png', 11 * 1024 * 1024)]))
      .rejects.toThrow(/lebih dari 10 MB/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('memeriksa seluruh berkas dulu, bukan satu per satu sambil mengunggah', async () => {
    // Kalau berkas kedua ditolak setelah yang pertama terunggah, akun
    // Cloudinary menyimpan gambar yatim yang tidak dirujuk barang mana pun.
    const bad = new File([new Uint8Array(10)], 'x.gif', { type: 'image/gif' });
    await expect(uploadImages([png(), bad])).rejects.toBeInstanceOf(UploadError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('meneruskan pesan galat dari Cloudinary apa adanya', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Invalid signature' } }),
    } as Response);
    await expect(uploadImages([png()])).rejects.toThrow('Invalid signature');
  });

  it('konfigurasi yang belum lengkap memberi kalimat yang bisa ditindaklanjuti', async () => {
    // 503 dari backend; pesannya menyebut variabel apa yang kurang.
    getSignature.mockRejectedValue(
      new Error('Penyimpanan gambar belum dikonfigurasi. Lengkapi CLOUDINARY_CLOUD_NAME…'),
    );
    await expect(uploadImages([png()])).rejects.toThrow(/belum dikonfigurasi/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

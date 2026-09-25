import { describe, expect, it } from 'vitest';
import { imageThumb } from '@shared/image';

/**
 * Backend menyimpan URL Cloudinary tanpa transformasi, sehingga kartu selebar
 * 170px mengunduh JPEG aslinya — 101 KB untuk satu gambar. Dengan
 * `f_auto,q_auto,w_*` berkas yang sama menjadi WebP ~5 KB.
 */
const CLOUD =
  'https://res.cloudinary.com/dpjwfljvc/image/upload/v1790103718/kopdes/products/abc.jpg';

describe('URL gambar', () => {
  it('menyisipkan transformasi setelah /image/upload/', () => {
    expect(imageThumb(CLOUD, 220)).toBe(
      'https://res.cloudinary.com/dpjwfljvc/image/upload/f_auto,q_auto,w_440,c_limit/v1790103718/kopdes/products/abc.jpg',
    );
  });

  it('meminta dua kali lebar CSS untuk layar 2x', () => {
    expect(imageThumb(CLOUD, 100)).toContain('w_200');
  });

  it('URL dari luar Cloudinary tidak disentuh', () => {
    const other = 'https://contoh.test/gambar.png';
    expect(imageThumb(other, 220)).toBe(other);
  });

  it('URL yang sudah punya transformasi tidak ditumpuk', () => {
    const already =
      'https://res.cloudinary.com/dpjwfljvc/image/upload/w_100/v1/a.jpg';
    expect(imageThumb(already, 220)).toBe(already);
  });

  it('kosong atau null menghasilkan string kosong', () => {
    expect(imageThumb(null, 220)).toBe('');
    expect(imageThumb(undefined, 220)).toBe('');
  });
});

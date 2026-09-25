/**
 * Menyiapkan URL gambar Cloudinary sesuai ukuran tampilnya.
 *
 * Backend menyimpan URL Cloudinary apa adanya — tanpa transformasi — sehingga
 * kartu produk selebar 170px mengunduh berkas aslinya, dalam format aslinya.
 * Menyisipkan `f_auto,q_auto` membuat Cloudinary mengirim AVIF atau WebP bagi
 * peramban yang mendukungnya, dan `w_` memotong ukurannya sesuai kartu.
 *
 * URL dari sumber lain dikembalikan apa adanya: menempelkan transformasi
 * Cloudinary ke domain lain hanya menghasilkan 404.
 */
export function imageThumb(url: string | null | undefined, width: number): string {
  if (!url) return '';
  const marker = '/image/upload/';
  const at = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || at === -1) return url;

  const head = url.slice(0, at + marker.length);
  const tail = url.slice(at + marker.length);
  // URL yang sudah punya transformasi tidak ditumpuk lagi.
  if (/^[a-z]_[^/]+\//.test(tail)) return url;

  // Dua kali lebar CSS-nya, bukan `dpr_auto`: tanpa Client Hints Cloudinary
  // memperlakukan dpr_auto sebagai 1.0, dan layar 2x menerima gambar buram.
  // `c_limit` tidak pernah memperbesar gambar yang aslinya lebih kecil.
  return `${head}f_auto,q_auto,w_${width * 2},c_limit/${tail}`;
}

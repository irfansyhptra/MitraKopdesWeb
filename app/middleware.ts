import { NextResponse, type NextRequest } from 'next/server';

/**
 * Penjaga rute berdasarkan cookie penanda sesi.
 *
 * Ini **kenyamanan, bukan keamanan**. Cookie-nya hanya berisi "1" dan bisa
 * dikarang siapa pun di peramban; yang menolak permintaan tetap backend,
 * lewat token yang sah. Gunanya menghilangkan kedipan: sebelum ini tiap
 * halaman terjaga menggambar dirinya lebih dulu, baru memeriksa token di
 * `useEffect` dan melempar ke /login — jadi isinya sempat terlihat sekejap.
 *
 * Pemeriksaan di halaman tetap ada dan tidak boleh dihapus: cookie yang
 * dikarang akan lolos di sini, dan halamanlah yang menemukan tokennya tidak
 * ada atau ditolak server.
 */

/** Rute yang tidak berarti apa-apa tanpa akun. */
const PROTECTED = [
  '/profile',
  '/orders',
  '/checkout',
  '/order-success',
  '/tracking',
  '/pegawai',
  '/super-admin',
];

/** Rute yang tidak masuk akal bagi yang sudah masuk. */
const GUEST_ONLY = ['/login', '/register'];

const SESSION_COOKIE = 'kopdes_session';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.get(SESSION_COOKIE)?.value === '1';

  if (!signedIn && PROTECTED.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Tujuan semula dibawa serta supaya setelah masuk pengguna kembali ke
    // tempat yang ia tuju, bukan ke beranda.
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (signedIn && GUEST_ONLY.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    // `next` dihormati: pengguna bisa sampai di /login lewat tautan lama
    // padahal sesinya masih hidup.
    const next = request.nextUrl.searchParams.get('next');
    url.pathname = next?.startsWith('/') ? next.split('?')[0] : '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Aset statis dan gambar tidak perlu diperiksa; memeriksanya hanya
  // menambah kerja pada tiap permintaan berkas.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

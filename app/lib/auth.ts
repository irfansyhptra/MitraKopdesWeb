/**
 * Sesi sisi klien.
 *
 * Token tetap di localStorage — ia yang dikirim sebagai `Authorization` pada
 * tiap permintaan, dan hanya JavaScript yang membutuhkannya.
 *
 * Di samping itu ada satu cookie penanda, `kopdes_session`. Isinya "1", bukan
 * token: yang perlu diketahui server hanyalah "ada orang yang sudah masuk",
 * supaya middleware bisa memutuskan lebih dulu sebelum halaman digambar.
 * Menaruh token di cookie non-httpOnly tidak menambah keamanan apa pun dan
 * justru ikut terkirim pada setiap permintaan gambar dan aset.
 *
 * Penanda ini kenyamanan, bukan penjagaan: siapa pun bisa mengarangnya di
 * peramban. Yang menolak permintaan tetap backend, lewat token yang sah.
 */

const TOKEN_KEY = 'kopdes_access_token';
const REFRESH_KEY = 'kopdes_refresh_token';

export const SESSION_COOKIE = 'kopdes_session';

/** Dibaca komponen yang perlu tahu sesi berubah di tab lain. */
export const SESSION_EVENT = 'kopdes:session';

function setSessionCookie(active: boolean) {
  if (typeof document === 'undefined') return;
  // Umur 30 hari mengikuti refresh token; SameSite=Lax supaya tetap terkirim
  // saat pengguna kembali lewat tautan dari luar, tanpa ikut pada permintaan
  // lintas situs.
  document.cookie = active
    ? `${SESSION_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
    : `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function announce() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function isSignedIn(): boolean {
  return getToken() !== null;
}

export function setTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
  setSessionCookie(true);
  announce();
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
  setSessionCookie(false);
  announce();
}

/**
 * Menyelaraskan cookie dengan localStorage.
 *
 * Dipanggil saat aplikasi dibuka. Keduanya bisa berbeda: cookie punya masa
 * berlaku sendiri dan bisa kedaluwarsa lebih dulu, atau pengguna menghapus
 * salah satunya lewat pengaturan peramban. localStorage yang menyimpan token
 * sesungguhnya, jadi ia yang menang.
 */
export function syncSessionCookie() {
  if (typeof window === 'undefined') return;
  const hasToken = getToken() !== null;
  const hasCookie = document.cookie.includes(`${SESSION_COOKIE}=1`);
  if (hasToken !== hasCookie) setSessionCookie(hasToken);
}

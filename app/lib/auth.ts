// Penyimpanan token sisi klien (localStorage). Untuk produksi, pertimbangkan
// httpOnly cookie; scaffold ini memakai localStorage demi kesederhanaan.
const TOKEN_KEY = 'kopdes_access_token';
const REFRESH_KEY = 'kopdes_refresh_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

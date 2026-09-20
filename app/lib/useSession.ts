'use client';

import { useEffect, useState } from 'react';
import { isSignedIn, SESSION_EVENT, syncSessionCookie } from './auth';

/**
 * Keadaan sesi untuk komponen.
 *
 * `null` berarti belum diketahui — bukan "belum masuk". Perbedaannya penting:
 * server menggambar HTML tanpa akses ke localStorage, jadi menebak "belum
 * masuk" di render pertama membuat tombol "Masuk" berkedip muncul lalu hilang
 * bagi orang yang sebenarnya sudah masuk.
 *
 * Ikut mendengar perubahan dari tab lain: keluar di satu tab harus terlihat
 * di tab yang masih terbuka, bukan menunggu halaman dimuat ulang.
 */
export function useSession(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const read = () => setSignedIn(isSignedIn());

    syncSessionCookie();
    read();

    // `storage` untuk tab lain, event sendiri untuk tab ini — localStorage
    // tidak mengirim `storage` ke tab yang mengubahnya.
    window.addEventListener('storage', read);
    window.addEventListener(SESSION_EVENT, read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener(SESSION_EVENT, read);
    };
  }, []);

  return signedIn;
}

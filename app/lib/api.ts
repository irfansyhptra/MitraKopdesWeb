import { createApiClient } from '@shared/api';
import { getToken, refreshSession } from './auth';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://backend-kopdes.vercel.app/api/v1';

/**
 * Klien sisi klien.
 *
 * Access token berumur pendek (15 menit di backend), jadi 401 karena
 * kedaluwarsa adalah kejadian biasa, bukan tanda pengguna harus masuk lagi.
 * `refreshAuth` menukarnya dengan yang baru lalu permintaannya diulang —
 * sesi bertahan selama refresh token masih hidup, dan tiap penyegaran
 * memperpanjangnya karena backend merotasinya.
 */
export const api = createApiClient({
  baseUrl: API_URL,
  getToken,
  refreshAuth: () => refreshSession(API_URL),
});

// Klien tanpa token untuk server component (data publik).
export const publicApi = createApiClient({ baseUrl: API_URL });

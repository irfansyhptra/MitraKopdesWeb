import { createApiClient } from '@shared/api';
import { getToken } from './auth';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://backend-kopdes.vercel.app/api/v1';

// Klien sisi klien (menyertakan JWT dari localStorage).
export const api = createApiClient({ baseUrl: API_URL, getToken });

// Klien tanpa token untuk server component (data publik).
export const publicApi = createApiClient({ baseUrl: API_URL });

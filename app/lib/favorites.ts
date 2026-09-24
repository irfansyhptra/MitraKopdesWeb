'use client';

/**
 * Produk favorit, tersimpan per peramban.
 *
 * Aplikasi mobile menyimpan favorit lewat ApiCache karena ia harus bisa
 * merender daftarnya saat offline. Di web yang dibutuhkan hanya penanda pada
 * kartu yang memang sedang tampil, jadi cukup daftar id — bukan salinan
 * seluruh produk yang akan basi begitu harganya berubah.
 *
 * Belum ada endpoint favorit di backend, jadi daftarnya melekat pada
 * peramban ini saja. Begitu endpointnya ada, modul ini yang diganti, bukan
 * tiap kartu.
 */

const KEY = 'kopdes.favorites';

/** Pelanggan perubahan, supaya semua kartu ikut berubah tanpa state global. */
const listeners = new Set<() => void>();

function read(): Set<string> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []);
  } catch {
    // Mode privat, penyimpanan penuh, atau JSON rusak: favorit hilang, tetapi
    // halamannya tetap jalan.
    return new Set();
  }
}

function write(ids: Set<string>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {
    // Diamkan — gagal menyimpan tidak boleh membatalkan interaksinya.
  }
  for (const listener of listeners) listener();
}

export function isFavorite(id: string): boolean {
  if (typeof window === 'undefined') return false;
  return read().has(id);
}

export function toggleFavorite(id: string): boolean {
  const ids = read();
  const next = !ids.has(id);
  if (next) ids.add(id);
  else ids.delete(id);
  write(ids);
  return next;
}

/** Dipakai `useSyncExternalStore`; tab lain ikut lewat event `storage`. */
export function subscribeFavorites(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

'use client';

import { useEffect, useState } from 'react';
import { api } from './api';
import { getToken } from './auth';
import type { User } from '@shared/api';

/**
 * Akun yang sedang masuk, dipakai bersama oleh beberapa komponen.
 *
 * Sidebar dan header beranda menampilkan nama yang sama; tanpa cache ini
 * keduanya memanggil `/me` sendiri-sendiri pada tiap muat halaman. Cache
 * dikunci pada token, jadi keluar lalu masuk sebagai orang lain tidak
 * menampilkan nama pemilik sesi sebelumnya.
 */

let cachedToken: string | null = null;
let cached: Promise<User> | null = null;
const ME_CHANGED = 'kopdes:me-changed';

export function refreshMeCache() {
  cached = null;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ME_CHANGED));
}

export function useMe(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      const token = getToken();
      if (!token) return;
      if (cachedToken !== token || !cached) {
        cachedToken = token;
        cached = api.me().catch((e) => {
          cached = null;
          throw e;
        });
      }
      void cached.then((me) => alive && setUser(me)).catch(() => undefined);
    };
    load();
    window.addEventListener(ME_CHANGED, load);
    return () => {
      alive = false;
      window.removeEventListener(ME_CHANGED, load);
    };
  }, []);

  return user;
}

/**
 * Jumlah barang di keranjang, untuk lencana di bilah atas.
 *
 * Nol berarti tidak ada lencana, bukan bulatan berisi "0"; tamu dan
 * permintaan yang gagal sama-sama berakhir di nol, karena keranjang yang
 * tidak bisa dibaca bukan kesalahan yang perlu ditampilkan di bilah atas.
 */
export function useCartCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!getToken()) return;
    let alive = true;
    void api
      .getCart()
      .then(
        (cart) =>
          alive && setCount(cart.items.reduce((n, i) => n + i.quantity, 0)),
      )
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return count;
}

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

export function useMe(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    if (cachedToken !== token || !cached) {
      cachedToken = token;
      // Gagal berarti cache dibuang: kalau tidak, satu kegagalan jaringan
      // membuat nama tidak pernah muncul sampai halaman dimuat ulang.
      cached = api.me().catch((e) => {
        cached = null;
        throw e;
      });
    }

    let alive = true;
    void cached
      .then((me) => alive && setUser(me))
      .catch(() => undefined);
    return () => {
      alive = false;
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

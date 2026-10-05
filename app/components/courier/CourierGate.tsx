'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { User } from '@shared/api';

const CourierCtx = createContext<{ user: User; reload: () => void } | null>(null);
export const useCourier = () => useContext(CourierCtx);

export function CourierGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    api.me().then((value) => value.role === 'COURIER' ? setUser(value) : setError('Portal ini hanya untuk kurir.')).catch((reason: Error) => setError(reason.message));
  }, []);
  useEffect(() => {
    if (!getToken()) { router.replace('/login?next=/courier'); return; }
    load();
  }, [load, router]);
  if (error) return <div className="staff"><main className="staff__body"><div className="staff-error"><strong>Akses tidak tersedia</strong><p>{error}</p><a className="staff-btn" href="/">Kembali</a></div></main></div>;
  if (!user) return <div className="staff"><main className="staff__body"><div className="staff-skeleton" style={{ height: 180 }} /></main></div>;
  return <CourierCtx.Provider value={{ user, reload: load }}><div className="staff courier-portal">
    <header className="staff-header"><div className="staff-header__inner"><div className="staff-header__top"><div className="staff-header__brand"><p className="staff-header__hello">Selamat Bertugas,</p><p className="staff-header__name">{user.name}</p></div><Link href="/courier/profile" className="staff-header__avatar" aria-label="Profil kurir">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name.trim()[0]?.toUpperCase() ?? 'K'}</Link></div><div className="staff-header__badges"><span className="staff-badge staff-badge--solid">Kurir KMP Mitra</span><span className="staff-badge">Data pengiriman langsung dari server</span></div></div></header>
    <nav className="staff-nav" aria-label="Navigasi kurir"><Link href="/courier">Pengiriman</Link><Link href="/courier/profile">Profil</Link></nav>
    <main className="staff__body">{children}</main>
  </div></CourierCtx.Provider>;
}

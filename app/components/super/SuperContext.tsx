'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
} from '@shared/design/icons';
import type { User } from '@shared/api';

/**
 * Gerbang dan kerangka portal Super Admin.
 *
 * Perannya diperiksa dari `/auth/me`, bukan dari sesuatu yang disimpan di
 * peramban. Ini tetap kenyamanan, bukan pembatasan: setiap endpoint
 * `/super-admin/*` dijaga `@Roles(SUPER_ADMIN)` di server, jadi menyembunyikan
 * menu tidak menahan siapa pun yang memanggil API langsung.
 */

const SuperCtx = createContext<User | null>(null);
export const useSuperAdmin = () => useContext(SuperCtx);

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/super-admin', label: 'Ikhtisar', icon: LayoutDashboard },
  { href: '/super-admin/pengajuan', label: 'Pengajuan', icon: ClipboardList },
  { href: '/super-admin/kopdes', label: 'Koperasi', icon: Building2 },
];

export function SuperGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/super-admin';
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'denied' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const me = await api.me();
      if (me.role !== 'SUPER_ADMIN') {
        setState('denied');
        return;
      }
      setUser(me);
      setState('ready');
    } catch (e) {
      setError((e as Error).message);
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/super-admin');
      return;
    }
    void load();
  }, [load, router]);

  if (state === 'denied' || state === 'error') {
    return (
      <div className="staff">
        <div className="staff__body">
          <div className="staff-error" style={{ marginTop: 'var(--sp-xl)' }}>
            <strong style={{ color: 'var(--st-ink)', fontSize: 15 }}>
              {state === 'denied'
                ? 'Portal ini untuk pengurus sistem'
                : 'Portal belum berhasil dimuat'}
            </strong>
            <p>
              {state === 'denied'
                ? 'Akun Anda bukan Super Admin.'
                : error}
            </p>
            {state === 'denied' ? (
              <Link href="/" className="staff-btn" style={{ width: 'auto', lineHeight: '36px' }}>
                Kembali ke Beranda
              </Link>
            ) : (
              <button type="button" className="staff-btn" style={{ width: 'auto' }} onClick={() => void load()}>
                Coba Lagi
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SuperCtx.Provider value={user}>
      <div className="staff">
        <header className="staff-header">
          <div className="staff-header__inner">
            <div className="staff-header__top">
              <span className="staff-header__logo" aria-hidden="true">
                KMP
              </span>
              <div className="staff-header__brand">
                <strong>Pengurus Sistem</strong>
                <p className="staff-header__date">
                  {user?.email ?? 'Memuat…'}
                </p>
              </div>
            </div>
            <p className="staff-header__hello">Selamat Bekerja,</p>
            <p className="staff-header__name">{user?.name ?? 'Super Admin'}</p>
            <div className="staff-header__badges">
              <span className="staff-badge staff-badge--solid">Super Admin</span>
              <span className="staff-badge">Seluruh desa</span>
            </div>
          </div>
        </header>

        <nav className="staff-nav" aria-label="Navigasi pengurus sistem">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                (item.href === '/super-admin'
                  ? pathname === '/super-admin'
                  : pathname.startsWith(item.href))
                  ? 'page'
                  : undefined
              }
            >
              <item.icon size={20} aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="staff__body">
          {state === 'loading' ? (
            <div className="staff-skeleton" style={{ height: 180, marginTop: 'var(--sp-base)' }} />
          ) : (
            children
          )}
        </div>
      </div>
    </SuperCtx.Provider>
  );
}

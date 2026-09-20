'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  ClipboardList,
  House,
  ShoppingCart,
  Sparkles,
  Store,
  UserIcon,
  type LucideIcon,
} from '@shared/design/icons';

/**
 * Kerangka navigasi pelanggan — padanan `AppShell` + `CustomBottomNavBar`
 * pada aplikasi Flutter.
 *
 * Navigasi atas untuk layar lebar, navigasi bawah untuk ponsel: dua tampilan
 * dari satu daftar tujuan, supaya tab yang ada di mobile tidak pernah beda
 * dengan yang ada di web.
 */

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  accent?: boolean;
}

/**
 * Tujuan navigasi — sama persis dengan `CustomBottomNavBar` di mobile:
 * Beranda, Marketplace, Asisten, Pesanan, Profil. Asisten diberi aksen,
 * seperti `isAccent` pada item yang sama di Dart.
 */
const NAV: NavItem[] = [
  { href: '/', label: 'Beranda', icon: House },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/ai-assistant', label: 'Asisten', icon: Sparkles, accent: true },
  { href: '/orders', label: 'Pesanan', icon: ClipboardList },
  { href: '/profile', label: 'Profil', icon: UserIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  cartCount = 0,
}: {
  children: ReactNode;
  cartCount?: number;
}) {
  const pathname = usePathname() ?? '/';

  // Portal pegawai punya kerangkanya sendiri. Pegawai yang sedang memproses
  // pesanan tidak sedang berbelanja, jadi navigasi pelanggan tidak ikut
  // digambar di sana.
  if (pathname.startsWith('/pegawai') || pathname.startsWith('/super-admin'))
    return <>{children}</>;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__inner">
          <Link href="/" className="brand" aria-label="Beranda KMP Mitra">
            KMP<span>Mitra</span>
          </Link>

          <nav className="topnav" aria-label="Navigasi utama">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="topbar__actions">
            <Link
              href="/orders"
              className="icon-btn"
              aria-label={
                cartCount > 0
                  ? `Keranjang, ${cartCount} produk`
                  : 'Keranjang'
              }
            >
              <ShoppingCart size={18} aria-hidden="true" />
              {/* Nol berarti lencana tidak digambar, bukan bulatan berisi "0". */}
              {cartCount > 0 && (
                <span className="icon-btn__badge">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            <Link href="/login" className="kc-btn kc-btn--primary">
              Masuk
            </Link>
          </div>
        </div>
      </header>

      <main className="main">{children}</main>

      <nav className="bottomnav" aria-label="Navigasi bawah">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            data-accent={item.accent ? 'true' : undefined}
          >
            <span className="bottomnav__icon" aria-hidden="true">
              <item.icon size={20} strokeWidth={2.2} />
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

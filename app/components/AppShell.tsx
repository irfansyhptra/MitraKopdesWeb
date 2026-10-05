'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSession } from '@/lib/useSession';
import { useCartCount, useMe } from '@/lib/useMe';
import { Sidebar } from './Sidebar';
import { Bell, ShoppingCart } from '@shared/design/icons';
import { isActive, NAV } from './nav';

/**
 * Kerangka navigasi pelanggan — padanan `AppShell` + `CustomBottomNavBar`
 * pada aplikasi Flutter.
 *
 * Navigasi atas untuk layar lebar, navigasi bawah untuk ponsel: dua tampilan
 * dari satu daftar tujuan, supaya tab yang ada di mobile tidak pernah beda
 * dengan yang ada di web.
 */

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const me = useMe();
  const cartCount = useCartCount();

  // Portal pegawai punya kerangkanya sendiri. Pegawai yang sedang memproses
  // pesanan tidak sedang berbelanja, jadi navigasi pelanggan tidak ikut
  // digambar di sana.
  if (
    pathname.startsWith('/pegawai') ||
    pathname.startsWith('/super-admin') ||
    (pathname === '/admin' || pathname.startsWith('/admin/')) ||
    (pathname === '/umkm' || pathname.startsWith('/umkm/')) ||
    (pathname === '/courier' || pathname.startsWith('/courier/'))
  )
    return <>{children}</>;

  return (
    <div className="shell">
      <Sidebar user={me} />

      {/*
        Tiga kelompok kaca: kapsul menu, kotak keranjang, lalu kapsul
        notifikasi dan akun. Bilahnya sendiri tidak punya permukaan, jadi isi
        halaman terlihat di celah antar kelompok saat bergulir.
      */}
      <header className="topbar">
        <div className="topbar__inner">
          <Link href="/" className="navgroup brand" aria-label="Beranda KMP Mitra">
            KMP<span>Mitra</span>
          </Link>

          <nav className="navgroup navgroup--menu" aria-label="Navigasi ringkas">
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

          <div className="navgroup navgroup--square">
            <Link
              href="/cart"
              className="icon-btn"
              aria-label={
                cartCount > 0 ? `Keranjang, ${cartCount} produk` : 'Keranjang'
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
          </div>

          <div className="topbar__account">
            {/* Belum ada endpoint notifikasi, jadi belum ada lencana yang
                jujur bisa ditampilkan di sini; tautannya ke halaman akun,
                tempat pengaturan notifikasi akan tinggal. */}
            <Link href="/profile" className="icon-btn" aria-label="Notifikasi">
              <Bell size={18} aria-hidden="true" />
            </Link>
            <AuthAction name={me?.name} avatarUrl={me?.avatarUrl} />
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

/**
 * Akun di kapsul kanan: avatar untuk yang sudah masuk, tombol "Masuk" untuk
 * tamu.
 *
 * Selama keadaan sesi belum diketahui — render di server, dan sesaat sebelum
 * hidrasi — slotnya dibiarkan kosong dengan lebar tetap. Menebak "belum
 * masuk" membuat tombol Masuk berkedip muncul lalu hilang bagi orang yang
 * sebenarnya sudah masuk, dan menebak sebaliknya menyembunyikan satu-satunya
 * jalan masuk bagi tamu.
 */
function AuthAction({ name, avatarUrl }: { name?: string; avatarUrl?: string | null }) {
  const signedIn = useSession();

  if (signedIn === null) {
    return <span className="authslot" aria-hidden="true" />;
  }

  if (signedIn) {
    return (
      <Link href="/profile" className="topbar__avatar" aria-label="Akun Saya">
        {avatarUrl
          ? <img src={avatarUrl} alt="" />
          : <span aria-hidden="true">{initials(name)}</span>}
      </Link>
    );
  }

  return (
    <Link href="/login" className="kc-btn kc-btn--primary">
      Masuk
    </Link>
  );
}

/** Dua huruf pertama dari nama; tanpa nama, ikon orang yang netral. */
function initials(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  return parts
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

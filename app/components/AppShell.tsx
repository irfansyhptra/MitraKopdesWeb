'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSession } from '@/lib/useSession';
import { useCartCount, useMe } from '@/lib/useMe';
import { Sidebar } from './Sidebar';
import { ShoppingCart } from '@shared/design/icons';
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
  if (pathname.startsWith('/pegawai') || pathname.startsWith('/super-admin'))
    return <>{children}</>;

  return (
    <div className="shell">
      <Sidebar user={me} />

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
            <AuthAction />
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
 * Tombol "Masuk" hanya untuk yang belum masuk.
 *
 * Selama keadaan sesi belum diketahui — render di server, dan sesaat sebelum
 * hidrasi — slotnya dibiarkan kosong dengan lebar tetap. Menebak "belum
 * masuk" membuat tombol Masuk berkedip muncul lalu hilang bagi orang yang
 * sebenarnya sudah masuk, dan menebak sebaliknya menyembunyikan satu-satunya
 * jalan masuk bagi tamu.
 */
function AuthAction() {
  const signedIn = useSession();

  if (signedIn === null) {
    return <span className="authslot" aria-hidden="true" />;
  }

  if (signedIn) {
    return (
      <Link href="/profile" className="kc-btn kc-btn--secondary">
        Akun Saya
      </Link>
    );
  }

  return (
    <Link href="/login" className="kc-btn kc-btn--primary">
      Masuk
    </Link>
  );
}

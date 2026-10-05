'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSeller } from './SellerContext';
import {
  LayoutDashboard,
  Package2,
  ReceiptText,
  Store,
  UserIcon,
  type LucideIcon,
} from '@shared/design/icons';

const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/umkm', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/umkm/products', label: 'Produk', icon: Package2 },
  { href: '/umkm/orders', label: 'Pesanan', icon: ReceiptText },
  { href: '/umkm/profile', label: 'Profil Toko', icon: UserIcon },
];

export function SellerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/umkm';
  const { user, store } = useSeller();
  const active = (href: string) => href === '/umkm'
    ? pathname === href
    : pathname.startsWith(href);

  return <div className="staff seller-portal">
    <header className="staff-header">
      <div className="staff-header__inner">
        <div className="staff-header__top">
          <span className="staff-header__logo"><Store size={22} aria-hidden="true" /></span>
          <div className="staff-header__brand">
            <strong>Portal Mitra UMKM</strong>
            <p className="staff-header__date">Kelola toko, produk, dan pesanan</p>
          </div>
          <Link href="/umkm/profile" className="staff-header__avatar" aria-label="Profil toko">
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="" />
              : user.name.trim()[0]?.toUpperCase() ?? 'U'}
          </Link>
        </div>
        <p className="staff-header__hello">Selamat Datang Kembali,</p>
        <p className="staff-header__name">{store.businessName}</p>
        <div className="staff-header__badges">
          <span className="staff-badge staff-badge--solid">Pemilik UMKM</span>
          <span className="staff-badge">{store.status.replaceAll('_', ' ')}</span>
        </div>
      </div>
    </header>

    <nav className="staff-nav" aria-label="Navigasi penjual UMKM">
      {NAV.map((item) => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined}>
        <item.icon size={20} aria-hidden="true" />{item.label}
      </Link>)}
    </nav>
    <main className="staff__body">{children}</main>
  </div>;
}

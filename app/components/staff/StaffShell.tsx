'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useStaff } from './StaffContext';
import {
  CircleCheckBig,
  CircleSlash,
  Clock,
  LayoutDashboard,
  Package2,
  ReceiptText,
  ShieldCheck,
  Store,
  UserIcon,
  UsersRound,
  type LucideIcon,
} from '@shared/design/icons';
import { Permissions } from '@shared/api';

/**
 * Kerangka portal pegawai — padanan `KopdesEmployeeHeader` dan
 * `EmployeeBottomNavigation` pada aplikasi Flutter.
 *
 * Navigasinya milik staf, bukan navigasi pelanggan: pegawai yang sedang
 * memproses pesanan tidak sedang berbelanja.
 */

const NAV: {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Tujuan yang hanya ada bagi pemilik koperasi. */
  permission?: string;
}[] = [
  { href: '/pegawai', label: 'Beranda', icon: LayoutDashboard },
  { href: '/pegawai/pesanan', label: 'Pesanan', icon: ReceiptText },
  { href: '/pegawai/stok', label: 'Stok', icon: Package2 },
  {
    href: '/pegawai/anggota',
    label: 'Anggota',
    icon: UsersRound,
    permission: Permissions.memberManage,
  },
  {
    href: '/pegawai/akun',
    label: 'Akun',
    icon: ShieldCheck,
    permission: Permissions.staffManage,
  },
  { href: '/pegawai/profil', label: 'Profil', icon: UserIcon },
];

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function todayLabel(now: Date): string {
  const day = DAYS[(now.getDay() + 6) % 7];
  return `${day}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

export function roleLabel(role: string | null): string {
  switch (role) {
    case 'ADMIN_KOPDES':
      return 'Admin Kopdes';
    case 'SUPER_ADMIN':
      return 'Super Admin';
    default:
      return 'Pegawai Kopdes';
  }
}

export function StaffShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/pegawai';
  const { user, role, store, storeUnknown, can } = useStaff();
  // Navigasi pegawai tidak memuat tujuan yang tidak pernah bisa dibukanya.
  const nav = NAV.filter((item) => !item.permission || can(item.permission));
  const initial = user?.name.trim()[0]?.toUpperCase() ?? '?';

  // Status toko datang dari jadwal operasional. Selama belum terbaca lebih
  // baik diam daripada menebak "Tutup" — pegawai bisa saja menutup toko
  // hanya karena percaya pada tebakan itu.
  const { StatusIcon, statusLabel } = storeUnknown
    ? { StatusIcon: Clock, statusLabel: 'Status toko belum terbaca' }
    : store?.isOpen === true
      ? { StatusIcon: CircleCheckBig, statusLabel: `Buka${store.closesAt ? ` · tutup ${store.closesAt}` : ''}` }
      : store?.isOpen === false
        ? { StatusIcon: CircleSlash, statusLabel: `Tutup${store.opensAt ? ` · buka ${store.opensAt}` : ''}` }
        : { StatusIcon: Clock, statusLabel: 'Jadwal belum diatur' };

  return (
    <div className="staff">
      <header className="staff-header">
        <div className="staff-header__inner">
          <div className="staff-header__top">
            <span className="staff-header__logo" aria-hidden="true">
              KMP
            </span>
            <div className="staff-header__brand">
              <strong>KMP Mitra</strong>
              <p className="staff-header__date">{todayLabel(new Date())}</p>
            </div>
            <Link
              href="/pegawai/profil"
              className="staff-header__avatar"
              aria-label={`Profil ${user?.name ?? 'pegawai'}`}
            >
              {initial}
            </Link>
          </div>

          <p className="staff-header__hello">Selamat Bekerja,</p>
          <p className="staff-header__name">{user?.name ?? 'Pegawai'}</p>

          <div className="staff-header__badges">
            <span className="staff-badge staff-badge--solid">
              {roleLabel(role)}
            </span>
            <span className="staff-badge">
              <Store size={12} aria-hidden="true" />
              {store?.name ?? user?.kopdes?.name ?? 'Kopdes Merah Putih'}
            </span>
            <span className="staff-badge">
              <StatusIcon size={12} aria-hidden="true" />
              {statusLabel}
            </span>
          </div>
        </div>
      </header>

      <nav className="staff-nav" aria-label="Navigasi pegawai">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={
              (item.href === '/pegawai'
                ? pathname === '/pegawai'
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

      <main className="staff__body">{children}</main>
    </div>
  );
}

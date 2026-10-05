'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Handshake, UserIcon } from '@shared/design/icons';
import { isActive, NAV } from './nav';
import type { User } from '@shared/api';

/**
 * Sidebar kaca — komposisi desktop.
 *
 * Hanya muncul di ≥1024px; di bawah itu navigasinya adalah bilah bawah
 * mengambang, bukan sidebar yang dikecilkan. Tujuannya sama persis dengan
 * bilah bawah supaya tidak ada dua peta navigasi yang bisa berbeda.
 */

export function Sidebar({ user }: { user: User | null }) {
  const pathname = usePathname() ?? '/';

  return (
    <aside className="sidebar" aria-label="Navigasi samping">
      <Link href="/" className="sidebar__brand">
        <span className="sidebar__mark" aria-hidden="true">
          KMP
        </span>
        KMP Mitra
      </Link>

      <nav className="sidebar__nav" aria-label="Navigasi utama">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? 'page' : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="sidebar__foot">
        <Link href="/profile" className="sidebar__user">
          <span className="sidebar__avatar" aria-hidden="true">
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt="" />
              : <UserIcon size={17} />}
          </span>
          <span>
            <strong>{user?.name ?? 'Warga Desa'}</strong>
            <span>{user ? (user.kopdes?.name ?? 'Anggota') : 'Belum masuk'}</span>
          </span>
        </Link>

        <Link href="/kopdes" className="sidebar__promo">
          <Handshake size={20} aria-hidden="true" />
          Bersama membangun koperasi desa yang lebih kuat
        </Link>
      </div>
    </aside>
  );
}

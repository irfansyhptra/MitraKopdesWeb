'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Card } from '@shared/design/ui';
import {
  BadgeCheck,
  MapPin,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Sparkles,
  Star,
  UserIcon,
  Wallet,
  Award,
} from '@shared/design/icons';
import type { User } from '@shared/api';
import type { LucideIcon } from '@shared/design/icons';

/**
 * Header beranda + ringkasan keanggotaan — padanan `CompactHomeHeader` dan
 * `MembershipSummaryCard` pada aplikasi Flutter.
 *
 * Bagian ini client component sementara sisa beranda tetap server component:
 * hanya sapaan, jumlah keranjang, dan nama Kopdes yang bergantung pada siapa
 * yang membuka. Daftar produknya sama untuk semua orang, jadi tidak ada
 * gunanya menunggu JavaScript untuk menggambarnya.
 */

export function HomeHero() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!getToken()) return;
    // Dua permintaan tambahan yang boleh gagal diam-diam: tamu tetap melihat
    // beranda yang sama, hanya tanpa nama dan tanpa jumlah keranjang.
    let cancelled = false;
    void api
      .me()
      .then((me) => !cancelled && setUser(me))
      .catch(() => undefined);
    void api
      .getCart()
      .then(
        (cart) =>
          !cancelled &&
          setCartCount(cart.items.reduce((n, i) => n + i.quantity, 0)),
      )
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/marketplace?q=${encodeURIComponent(q)}` : '/marketplace');
  }

  return (
    <div className="stack-md">
      <header className="kc-hero">
        <div className="kc-hero__top">
          <span className="kc-hero__mark" aria-hidden="true">
            KMP
          </span>

          <div className="kc-hero__who">
            <p className="kc-hero__hello">Selamat Datang Kembali,</p>
            <p className="kc-hero__name">
              <span>{user?.name ?? 'Warga Desa'}</span>
              {/* Lencana ini menyampaikan status, bukan hiasan — jadi ia
                  punya teks untuk pembaca layar. */}
              {user && (
                <span title="Akun terverifikasi" style={{ color: 'var(--yellow-accent)' }}>
                  <span className="visually-hidden">Akun terverifikasi</span>
                  <BadgeCheck size={15} aria-hidden="true" />
                </span>
              )}
            </p>
            {/* Lokasi datang dari Kopdes tempat akun terdaftar. Tanpa itu
                tidak ada desa yang bisa disebut — versi mobile menuliskan
                "Desa Lamteh" tetap di dalam kode, dan itu tidak ditiru. */}
            <p className="kc-hero__place">
              <MapPin size={12} aria-hidden="true" />
              {user?.kopdes?.name ?? 'Pilih koperasi desamu'}
            </p>
          </div>

          <div className="kc-hero__acts">
            <Link
              href="/orders"
              className="kc-iconbtn"
              aria-label={
                cartCount > 0 ? `Keranjang, ${cartCount} produk` : 'Keranjang'
              }
            >
              <ShoppingCart size={19} aria-hidden="true" />
              {cartCount > 0 && (
                <span className="kc-iconbtn__badge">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/ai-assistant"
              className="kc-iconbtn"
              aria-label="Asisten AI"
            >
              <Sparkles size={19} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <form className="kc-hero__search" onSubmit={search} role="search">
          <label className="kc-hero__field">
            <Search size={19} aria-hidden="true" />
            <span className="visually-hidden">Cari produk</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari produk kebutuhanmu..."
            />
          </label>
          <button type="submit" className="kc-hero__filter">
            <Search size={17} aria-hidden="true" style={{ color: 'var(--primary)' }} />
            Cari
          </button>
        </form>
      </header>

      <Card className="stack-md">
        <div className="kc-summary">
          <SummaryItem icon={Wallet} tint="var(--primary)" label="Saldo Anggota" />
          <SummaryItem icon={Star} tint="var(--warning)" label="Poin Belanja" />
          <div className="kc-summary__item">
            <p className="kc-summary__label">
              <Award
                size={13}
                aria-hidden="true"
                style={{ color: 'var(--yellow-accent)' }}
              />
              Status
            </p>
            <p className="kc-summary__value">
              {user ? 'Anggota' : 'Belum masuk'}
            </p>
          </div>
        </div>

        <nav className="kc-quick" aria-label="Aksi cepat">
          <Link href="/marketplace">
            <Plus size={15} aria-hidden="true" />
            Belanja
          </Link>
          <Link href="/orders">
            <ReceiptText size={15} aria-hidden="true" />
            Riwayat
          </Link>
          <Link href="/ai-assistant">
            <Sparkles size={15} aria-hidden="true" />
            Asisten
          </Link>
          <Link href="/profile">
            <UserIcon size={15} aria-hidden="true" />
            Detail
          </Link>
        </nav>
      </Card>
    </div>
  );
}

/**
 * Saldo dan poin sengaja tidak menampilkan angka.
 *
 * Aplikasi mobile menulis "Rp 250.000" dan "1.250" tetap di dalam kode —
 * tidak ada endpoint saldo maupun poin di backend. Menyalin angka itu ke web
 * berarti halaman akun memberi tahu orang bahwa ia punya uang yang tidak
 * pernah ada. Slotnya tetap disediakan supaya tinggal diisi begitu
 * endpoint-nya dibuat.
 */
function SummaryItem({
  icon: Icon,
  tint,
  label,
}: {
  icon: LucideIcon;
  tint: string;
  label: string;
}) {
  return (
    <div className="kc-summary__item">
      <p className="kc-summary__label">
        <Icon size={13} aria-hidden="true" style={{ color: tint }} />
        {label}
      </p>
      <p className="kc-summary__value" style={{ color: 'var(--muted-soft)' }}>
        —
      </p>
    </div>
  );
}

'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMe } from '@/lib/useMe';
import {
  BadgeCheck,
  MapPin,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
  Star,
  UserIcon,
  Wallet,
  Award,
} from '@shared/design/icons';
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

export function HomeHero({ children }: { children?: ReactNode }) {
  const router = useRouter();
  // Nama datang dari cache bersama: sidebar menampilkan nama yang sama, dan
  // dua komponen tidak perlu dua permintaan `/me`.
  const user = useMe();
  const [query, setQuery] = useState('');

  function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/marketplace?q=${encodeURIComponent(q)}` : '/marketplace');
  }

  return (
    <div className="stack-lg">
      <header className="hero-search">
        {/* Gelombang dekoratif — tidak membawa informasi apa pun. */}
        <svg
          className="hero-search__wave"
          viewBox="0 0 400 220"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M0 96C64 46 118 150 190 118s118-96 210-52v154H0z"
            fill="rgba(227,27,35,0.10)"
          />
          <path
            d="M20 140C90 104 132 186 214 156s126-58 186-24v88H20z"
            fill="rgba(227,27,35,0.07)"
          />
        </svg>

        <div className="hero-search__head">
          <span className="hero-search__mark" aria-hidden="true">
            KMP
          </span>

          <div className="hero-search__who">
            <p className="hero-search__eyebrow">Selamat datang kembali,</p>
            <p className="hero-search__title">
              {user?.name ?? 'Warga Desa'}
              {/* Lencana ini menyampaikan status, bukan hiasan — jadi ia
                  punya teks untuk pembaca layar. */}
              {user && (
                <span
                  title="Akun terverifikasi"
                  style={{ color: 'var(--yellow-accent)', marginInlineStart: 6 }}
                >
                  <span className="visually-hidden">Akun terverifikasi</span>
                  <BadgeCheck size={16} aria-hidden="true" />
                </span>
              )}
            </p>
            {/* Lokasi datang dari Kopdes tempat akun terdaftar. Tanpa itu
                tidak ada desa yang bisa disebut — versi mobile menuliskan
                "Desa Lamteh" tetap di dalam kode, dan itu tidak ditiru. */}
            <p className="hero-search__sub">
              <MapPin size={12} aria-hidden="true" />{' '}
              {user?.kopdes?.name ?? 'Pusat Koperasi Desa Merah Putih'}
            </p>
          </div>

        </div>

        <form className="hero-search__form" onSubmit={search} role="search">
          <Search size={19} aria-hidden="true" />
          <span className="visually-hidden" id="home-search-label">
            Cari produk
          </span>
          <input
            type="search"
            aria-labelledby="home-search-label"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari produk kebutuhanmu…"
          />
          <button type="submit" className="kc-btn kc-btn--primary">
            Cari
          </button>
        </form>
      </header>

      {children}

      <div className="quickrow">
        <QuickItem icon={Wallet} tint="var(--primary)" label="Saldo Anggota" />
        <QuickItem icon={Star} tint="var(--warning)" label="Poin Belanja" />
        <div className="quickrow__item">
          <span className="quickrow__icon" aria-hidden="true">
            <Award size={17} style={{ color: 'var(--yellow-accent)' }} />
          </span>
          <span>
            <span className="quickrow__label">Status</span>
            <span className="quickrow__value">
              {user ? 'Anggota' : 'Belum masuk'}
            </span>
          </span>
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
function QuickItem({
  icon: Icon,
  tint,
  label,
}: {
  icon: LucideIcon;
  tint: string;
  label: string;
}) {
  return (
    <div className="quickrow__item">
      <span className="quickrow__icon" aria-hidden="true">
        <Icon size={17} style={{ color: tint }} />
      </span>
      <span>
        <span className="quickrow__label">{label}</span>
        <span className="quickrow__value" style={{ color: 'var(--muted-soft)' }}>
          —
        </span>
      </span>
    </div>
  );
}

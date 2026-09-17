'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { clearTokens, getToken } from '@/lib/auth';
import {
  Badge,
  Button,
  Card,
  ListGroup,
  Message,
  SectionHeader,
  Skeleton,
} from '@shared/design/ui';
import type { User } from '@shared/api';

/**
 * Profil — padanan `ProfileScreen` pada aplikasi Flutter: header merah
 * melengkung, kartu identitas yang menindihnya, deret kartu statistik,
 * bilah pintasan, lalu tiga seksi menu.
 *
 * Satu hal sengaja berbeda. Di mobile, "Saldo Belanja Rp 1.250.000" dan
 * "1.250 Poin" ditulis tetap di dalam kode — tidak ada endpoint saldo maupun
 * poin di backend. Angka itu tidak disalin ke sini: halaman akun yang
 * menyebut nominal yang tidak ada jauh lebih berbahaya daripada kartu yang
 * berisi tanda hubung. Bentuk kartunya tetap, tinggal diisi.
 */

interface MenuItem {
  label: string;
  desc: string;
  href?: string;
  /** Fitur yang endpoint-nya belum ada; ditandai, bukan disembunyikan. */
  pending?: boolean;
}

const SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Akun Saya',
    items: [
      {
        label: 'Detail Profil',
        desc: 'Lihat dan edit informasi profil Anda',
        pending: true,
      },
      {
        label: 'Alamat Pengiriman',
        desc: 'Kelola alamat pengiriman Anda',
        href: '/profile/alamat',
      },
      {
        label: 'Metode Pembayaran',
        desc: 'Kelola kartu dan metode pembayaran',
        pending: true,
      },
      {
        label: 'Keamanan Akun',
        desc: 'Password, PIN, dan verifikasi akun',
        pending: true,
      },
      {
        label: 'Notifikasi',
        desc: 'Atur preferensi notifikasi Anda',
        pending: true,
      },
    ],
  },
  {
    title: 'Layanan Koperasi',
    items: [
      {
        label: 'Asisten KMP Mitra',
        desc: 'Tanya produk, promo, dan pesanan',
        href: '/ai-assistant',
      },
      {
        label: 'Riwayat Pesanan',
        desc: 'Lihat pesanan dan status pengiriman',
        href: '/orders',
      },
      {
        label: 'Pengajuan UMKM',
        desc: 'Ajukan usaha Anda menjadi mitra',
        pending: true,
      },
      {
        label: 'Mitra Driver',
        desc: 'Informasi dan pendaftaran driver',
        pending: true,
      },
    ],
  },
  {
    title: 'Pengaturan',
    items: [
      { label: 'Privasi', desc: 'Kebijakan privasi dan keamanan', pending: true },
      {
        label: 'Tentang Aplikasi',
        desc: 'Informasi tentang KMP Mitra',
        pending: true,
      },
    ],
  },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [addressCount, setAddressCount] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await api.me();
      setUser(me);
      // Dua angka tambahan; kegagalannya tidak menutup profil.
      void api
        .getAddresses()
        .then((list) => setAddressCount(list.length))
        .catch(() => undefined);
      void api
        .getCart()
        .then((cart) =>
          setCartCount(cart.items.reduce((n, i) => n + i.quantity, 0)),
        )
        .catch(() => undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/profile');
      return;
    }
    void load();
  }, [load, router]);

  function logout() {
    clearTokens();
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="stack-md">
        <Skeleton height={140} radius={20} />
        <Card className="stack-sm">
          <Skeleton height={56} width="56px" radius={28} />
          <Skeleton height={18} width="45%" />
          <Skeleton height={14} width="60%" />
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <Message
        title="Profil belum berhasil dimuat"
        body={error ?? undefined}
        actionLabel="Coba Lagi"
        onAction={() => void load()}
      />
    );
  }

  const initial = user.name.trim()[0]?.toUpperCase() ?? '?';

  return (
    <div className="stack-md">
      <header className="kc-hero" style={{ paddingBottom: 'var(--sp-xl)' }}>
        <div className="kc-hero__top">
          <div className="kc-hero__who">
            <p className="kc-hero__title">Profil Saya</p>
            <p className="kc-hero__subtitle">
              Kelola informasi &amp; pengaturan akun Anda
            </p>
          </div>
          <div className="kc-hero__acts">
            <Link
              href="/orders"
              className="kc-iconbtn"
              aria-label={
                cartCount ? `Keranjang, ${cartCount} produk` : 'Keranjang'
              }
            >
              <span aria-hidden="true">🛒</span>
              {!!cartCount && (
                <span className="kc-iconbtn__badge">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <div className="kc-overlap">
        <Card className="stack-md">
          <div
            style={{ display: 'flex', gap: 'var(--sp-base)', alignItems: 'center' }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 56,
                height: 56,
                flex: 'none',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                fontSize: 22,
                fontWeight: 700,
                background: 'var(--primary-tint)',
                color: 'var(--primary-active)',
              }}
            >
              {initial}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>
                {user.name}
              </p>
              <p className="t-caption-sm">✉ {user.email}</p>
              {user.phone && <p className="t-caption-sm">☎ {user.phone}</p>}
              {user.kopdes?.name && (
                <p className="t-caption-sm">📍 {user.kopdes.name}</p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
            <Badge variant="success">★ Anggota Aktif</Badge>
            <Badge variant="primary">{roleLabel(user.role)}</Badge>
            {addressCount != null && (
              <Badge variant="muted">{addressCount} alamat tersimpan</Badge>
            )}
          </div>
        </Card>
      </div>

      <div className="kc-rail">
        <Stat
          icon="🏛️"
          tint="#ffebee"
          label="Koperasi"
          value={user.kopdes?.name ?? 'Belum terdaftar'}
        />
        {/* Dua kartu berikutnya menunggu endpoint-nya; lihat catatan di atas. */}
        <Stat icon="👛" tint="#ffebee" label="Saldo Belanja" value="—" muted />
        <Stat icon="★" tint="#fff6e0" label="Poin Koperasi" value="—" muted />
        <Stat
          icon="✅"
          tint="#e7f6ec"
          label="Status"
          value="Aktif"
          color="var(--success)"
        />
      </div>

      <Card pad={false}>
        <nav className="kc-shortcut" aria-label="Pintasan">
          <Link href="/orders">
            <span className="kc-shortcut__icon" aria-hidden="true">
              🧾
            </span>
            Pesanan Saya
          </Link>
          <Link href="/orders">
            <span className="kc-shortcut__icon" aria-hidden="true">
              🛒
            </span>
            Keranjang
          </Link>
          <Link href="/marketplace">
            <span className="kc-shortcut__icon" aria-hidden="true">
              🏪
            </span>
            Belanja
          </Link>
          <Link href="/ai-assistant">
            <span className="kc-shortcut__icon" aria-hidden="true">
              ✦
            </span>
            Asisten
          </Link>
        </nav>
      </Card>

      <div className="kc-split">
        <div className="stack-md">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <SectionHeader title={section.title} />
              <ListGroup>
                {section.items.map((item) => (
                  <MenuRow key={item.label} item={item} />
                ))}
              </ListGroup>
            </div>
          ))}
        </div>

        <aside className="kc-split__aside">
          <Card className="stack-sm">
            <p className="t-caption-sm">
              Keluar akan menghapus sesi di peramban ini.
            </p>
            <Button variant="secondary" block onClick={logout}>
              Keluar dari Akun
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon,
  tint,
  label,
  value,
  color,
  muted = false,
}: {
  icon: string;
  tint: string;
  label: string;
  value: string;
  color?: string;
  muted?: boolean;
}) {
  return (
    <div className="kc-stat" style={{ ['--stat-tint' as string]: tint }}>
      <span className="kc-stat__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="kc-stat__label">{label}</p>
        <p
          className="kc-stat__value"
          style={{
            ['--stat-color' as string]: muted ? 'var(--muted-soft)' : color,
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function MenuRow({ item }: { item: MenuItem }) {
  const body = (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-md)' }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          {item.label}
        </span>
        <span className="t-caption-sm">{item.desc}</span>
      </span>
      {/* Fitur yang endpoint-nya belum ada diberi penanda, bukan dibuat
          seolah berfungsi lalu diam saat ditekan. */}
      {item.pending ? (
        <Badge variant="muted">Segera</Badge>
      ) : (
        <span aria-hidden="true" style={{ color: 'var(--muted-soft)' }}>
          ›
        </span>
      )}
    </span>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        style={{ display: 'block', padding: 'var(--sp-md) var(--sp-base)' }}
      >
        {body}
      </Link>
    );
  }

  return (
    <div style={{ padding: 'var(--sp-md) var(--sp-base)', opacity: 0.65 }}>
      {body}
    </div>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'ADMIN_KOPDES':
      return 'Admin Kopdes';
    case 'PEGAWAI_KOPDES':
      return 'Pegawai Kopdes';
    case 'COURIER':
      return 'Kurir';
    case 'UMKM':
      return 'Mitra UMKM';
    default:
      return 'Pelanggan';
  }
}

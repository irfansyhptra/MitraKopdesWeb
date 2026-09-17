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
 * Profil — padanan `ProfileScreen` pada aplikasi Flutter.
 *
 * Bedanya dengan versi mobile: baris statistik di sana ("Rp 1.250.000",
 * "1.250 Poin") masih angka tetap di dalam kode karena belum ada endpoint
 * saldo maupun poin. Angka itu tidak ditiru di sini — menampilkan saldo palsu
 * pada halaman akun jauh lebih berbahaya daripada tidak menampilkannya.
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
        label: 'Keamanan Akun',
        desc: 'Password dan verifikasi akun',
        pending: true,
      },
    ],
  },
  {
    title: 'Layanan Koperasi',
    items: [
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
      {
        label: 'Privasi',
        desc: 'Kebijakan privasi dan keamanan',
        pending: true,
      },
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await api.me();
      setUser(me);
      // Jumlah alamat bersifat tambahan; kegagalannya tidak menutup profil.
      void api
        .getAddresses()
        .then((list) => setAddressCount(list.length))
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
        <Skeleton height={28} width="35%" />
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
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Profil</h1>
          <p className="page-sub">Kelola akun dan layanan koperasimu</p>
        </div>
      </div>

      <div className="kc-split">
        <div className="stack-md">
          <Card className="stack-md">
            <div
              style={{
                display: 'flex',
                gap: 'var(--sp-base)',
                alignItems: 'center',
              }}
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
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--ink)',
                  }}
                >
                  {user.name}
                </p>
                <p className="t-caption-sm">{user.email}</p>
                {user.phone && <p className="t-caption-sm">{user.phone}</p>}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
              <Badge variant="primary">{roleLabel(user.role)}</Badge>
              {user.kopdes?.name && (
                <Badge variant="kopdes">{user.kopdes.name}</Badge>
              )}
              {addressCount != null && (
                <Badge variant="muted">{addressCount} alamat tersimpan</Badge>
              )}
            </div>
          </Card>

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

        <aside className="kc-split__aside stack-md">
          <Card className="stack-sm">
            <SectionHeader title="Akses Cepat" />
            <Link href="/orders" className="kc-btn kc-btn--secondary kc-btn--block">
              Pesanan Saya
            </Link>
            <Link
              href="/marketplace"
              className="kc-btn kc-btn--secondary kc-btn--block"
            >
              Marketplace
            </Link>
          </Card>

          <Card className="stack-sm">
            <p className="t-caption-sm">
              Keluar akan menghapus sesi di peramban ini.
            </p>
            <Button variant="secondary" block onClick={logout}>
              Keluar
            </Button>
          </Card>
        </aside>
      </div>
    </>
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
    <div
      style={{
        padding: 'var(--sp-md) var(--sp-base)',
        opacity: 0.65,
      }}
    >
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

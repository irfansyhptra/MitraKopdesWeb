'use client';

import { useCallback, useEffect, useState } from 'react';
import { publicApi } from '@/lib/api';
import { SectionHeader, Skeleton } from '@shared/design/ui';
import { LocateFixed } from '@shared/design/icons';
import type { Koperasi } from '@shared/api';

/**
 * Seksi "Kopdes Terdekat" di beranda — padanan `NearbyKoperasiSection`.
 *
 * Bedanya dengan versi mobile ada pada izin lokasi. Aplikasi boleh meminta
 * izin saat layar dibuka; peramban menghukum kebiasaan itu (Chrome memblokir
 * permintaan yang tidak dipicu pengguna dan mencatatnya sebagai sinyal buruk).
 * Jadi di sini: bila izin sudah pernah diberikan, lokasi diambil sendiri;
 * kalau belum, daftar tetap tampil tanpa jarak dan ada satu tombol untuk
 * menyalakannya. Daftar kosong yang terbaca "tidak ada Kopdes" tidak pernah
 * muncul hanya karena izin belum ada.
 */

import { KopdesCard } from './KopdesCard';

const LIMIT = 6;

export function NearbyKopdes() {
  const [items, setItems] = useState<Koperasi[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [located, setLocated] = useState(false);
  const [locating, setLocating] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const page = await publicApi.getKoperasiList('', 1, LIMIT);
      setItems(page.items);
    } catch {
      setFailed(true);
    }
  }, []);

  const loadNearby = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        const page = await publicApi.getNearbyKoperasi(
          { latitude, longitude },
          1,
          LIMIT,
        );
        // Radius 10 km bisa saja kosong di desa yang jarang. Daftar tanpa
        // jarak lebih berguna daripada seksi kosong.
        if (page.items.length === 0) return loadAll();
        setItems(page.items);
        setLocated(true);
      } catch {
        void loadAll();
      }
    },
    [loadAll],
  );

  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        void loadNearby(pos.coords.latitude, pos.coords.longitude);
      },
      // Ditolak atau gagal: daftar biasa tetap tampil, tanpa pesan galat —
      // menolak berbagi lokasi bukan kesalahan pengguna.
      () => {
        setLocating(false);
        if (!items) void loadAll();
      },
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, [items, loadAll, loadNearby]);

  useEffect(() => {
    let cancelled = false;
    void navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (cancelled) return;
        if (status.state === 'granted') locate();
        else void loadAll();
      })
      .catch(() => void loadAll());
    if (!navigator.permissions) void loadAll();
    return () => {
      cancelled = true;
    };
    // Sekali saat dipasang: `locate` dan `loadAll` stabil lewat useCallback,
    // tetapi memasukkannya membuat efek berjalan ulang tiap `items` berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) return null;

  return (
    <section>
      <SectionHeader
        title="Kopdes Terdekat"
        actionLabel="Lihat Lainnya"
        href="/kopdes"
      />

      {items === null ? (
        <div className="kc-rail">
          {[0, 1].map((i) => (
            <Skeleton key={i} width={268} height={210} radius={16} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="kc-meta">Belum ada Kopdes yang terdaftar di sistem.</p>
      ) : (
        <div className="kc-rail">
          {items.map((k) => (
            <KopdesCard key={k.id} koperasi={k} />
          ))}
        </div>
      )}

      {!located && items !== null && items.length > 0 && (
        <button type="button" className="kc-locate" onClick={locate} disabled={locating}>
          <LocateFixed size={15} aria-hidden="true" />
          {locating ? 'Mencari lokasi…' : 'Urutkan dari yang terdekat'}
        </button>
      )}
    </section>
  );
}

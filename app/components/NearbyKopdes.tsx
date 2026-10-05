'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { SectionHeader, Skeleton } from '@shared/design/ui';
import {
  LocateFixed,
  MapPin,
  Navigation,
  SlidersHorizontal,
  Star,
  Store,
} from '@shared/design/icons';
import { ratingLabel } from '@shared/format';
import type { Koperasi, Mitra } from '@shared/api';
import { KopdesCard } from './KopdesCard';

const LIMIT = 4;

/**
 * Lokasi dan dua seksi discovery berbagi satu permintaan geolocation.
 * Peramban hanya menampilkan dialog izin setelah tindakan pengguna, kecuali
 * izin memang sudah pernah diberikan.
 */
export function NearbyKopdes() {
  const [koperasi, setKoperasi] = useState<Koperasi[] | null>(null);
  const [mitra, setMitra] = useState<Mitra[] | null>(null);
  const [located, setLocated] = useState(false);
  const [locating, setLocating] = useState(false);

  const loadFallback = useCallback(async () => {
    const [koperasiResult, mitraResult] = await Promise.allSettled([
      publicApi.getKoperasiList('', 1, LIMIT),
      publicApi.getMitraList(undefined, 1, LIMIT),
    ]);
    setKoperasi(
      koperasiResult.status === 'fulfilled' ? koperasiResult.value.items : [],
    );
    setMitra(mitraResult.status === 'fulfilled' ? mitraResult.value.items : []);
  }, []);

  const loadNearby = useCallback(
    async (latitude: number, longitude: number) => {
      const [koperasiResult, mitraResult] = await Promise.allSettled([
        publicApi.getNearbyKoperasi({ latitude, longitude }, 1, LIMIT),
        publicApi.getNearbyMitra({ latitude, longitude }, 1, LIMIT),
      ]);

      if (koperasiResult.status === 'fulfilled') {
        setKoperasi(koperasiResult.value.items);
      }
      if (mitraResult.status === 'fulfilled') {
        setMitra(mitraResult.value.items);
      }
      if (
        koperasiResult.status === 'rejected' &&
        mitraResult.status === 'rejected'
      ) {
        await loadFallback();
        return;
      }
      setLocated(true);
    },
    [loadFallback],
  );

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      void loadFallback();
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        void loadNearby(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocating(false);
        void loadFallback();
      },
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, [loadFallback, loadNearby]);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.permissions) {
      void loadFallback();
      return () => {
        cancelled = true;
      };
    }

    void navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (cancelled) return;
        if (status.state === 'granted') locate();
        else void loadFallback();
      })
      .catch(() => void loadFallback());

    return () => {
      cancelled = true;
    };
  }, [loadFallback, locate]);

  return (
    <div className="home-discovery stack-lg">
      <div className="home-location">
        <span className="home-location__icon" aria-hidden="true">
          <MapPin size={20} />
        </span>
        <span className="home-location__copy">
          <span className="home-location__label">Lokasi Anda</span>
          <strong>
            {located
              ? 'Lokasi perangkat aktif'
              : 'Temukan Kopdes dan UMKM terdekat'}
          </strong>
        </span>
        <button
          type="button"
          className="kc-btn kc-btn--secondary home-location__action"
          onClick={locate}
          disabled={locating}
        >
          <LocateFixed size={16} aria-hidden="true" />
          {locating ? 'Mencari…' : located ? 'Perbarui' : 'Aktifkan'}
        </button>
        <Link
          href="/marketplace"
          className="home-location__filter"
          aria-label="Buka filter marketplace"
        >
          <SlidersHorizontal size={19} aria-hidden="true" />
          <span>Filter</span>
        </Link>
      </div>

      <section>
        <SectionHeader
          title="Kopdes Terdekat"
          actionLabel="Lihat Lainnya"
          href="/kopdes"
        />
        {koperasi === null ? (
          <NearbySkeleton />
        ) : koperasi.length > 0 ? (
          <div className="home-kopdes-grid">
            {koperasi.map((item) => (
              <KopdesCard key={item.id} koperasi={item} wide />
            ))}
          </div>
        ) : (
          <EmptyNearby label="Kopdes" />
        )}
      </section>

      <section>
        <SectionHeader
          title="UMKM di Sekitarmu"
          actionLabel="Lihat Produk"
          href="/marketplace?sellerType=UMKM"
        />
        {mitra === null ? (
          <NearbySkeleton />
        ) : mitra.length > 0 ? (
          <div className="home-mitra-grid">
            {mitra.map((item) => (
              <MitraCard key={item.id} mitra={item} />
            ))}
          </div>
        ) : (
          <EmptyNearby label="UMKM" />
        )}
      </section>
    </div>
  );
}

function NearbySkeleton() {
  return (
    <div className="home-kopdes-grid" aria-label="Memuat daftar terdekat">
      {[0, 1].map((key) => (
        <Skeleton key={key} width="100%" height={164} radius={20} />
      ))}
    </div>
  );
}

function EmptyNearby({ label }: { label: string }) {
  return (
    <p className="home-empty">
      Belum ada {label} yang dapat ditampilkan di area ini.
    </p>
  );
}

function MitraCard({ mitra }: { mitra: Mitra }) {
  const rating = ratingLabel(mitra.rating);
  const hasCoordinates =
    typeof mitra.latitude === 'number' && typeof mitra.longitude === 'number';

  return (
    <article className="home-mitra-card">
      <div className="home-mitra-card__media">
        {mitra.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mitra.photoUrl} alt={mitra.businessName} loading="lazy" />
        ) : (
          <Store size={28} aria-hidden="true" />
        )}
      </div>
      <div className="home-mitra-card__body">
        <p className="home-mitra-card__eyebrow">{categoryLabel(mitra.category)}</p>
        <h3>{mitra.businessName}</h3>
        <p className="kc-meta">
          {rating && (
            <span className="kc-meta__rating">
              <Star size={13} aria-hidden="true" /> {rating}
            </span>
          )}
          {mitra.distanceLabel && <span>{mitra.distanceLabel}</span>}
          {mitra.isOpen != null && (
            <span className={mitra.isOpen ? 'kc-meta__open' : undefined}>
              {mitra.isOpen ? 'Buka' : 'Tutup'}
            </span>
          )}
        </p>
        <p className="home-mitra-card__address">{mitra.address}</p>
        <div className="home-mitra-card__actions">
          <Link href="/marketplace?sellerType=UMKM" className="kc-btn kc-btn--primary">
            Belanja Produk
          </Link>
          {hasCoordinates && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${mitra.latitude},${mitra.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="kc-btn kc-btn--secondary"
              aria-label={`Petunjuk arah ke ${mitra.businessName}`}
            >
              <Navigation size={15} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function categoryLabel(category: Mitra['category']) {
  return category.charAt(0) + category.slice(1).toLowerCase();
}

import Link from 'next/link';
import { BadgeCheck, MapPin, Navigation, Star, Store } from '@shared/design/icons';
import { imageThumb } from '@shared/image';
import { ratingLabel } from '@shared/format';
import type { Koperasi, RatingSummary } from '@shared/api';

/**
 * Card Kopdes — padanan `KoperasiCard` pada aplikasi Flutter.
 *
 * Dipakai dua tempat dengan lebar berbeda: rail beranda (268px, seperti di
 * mobile) dan daftar `/kopdes` (selebar kolom). Hanya lebarnya yang berubah,
 * isinya sama, jadi tidak ada dua salinan markup yang bisa berbeda diam-diam.
 */

/** Jarak dari titik ini ke koperasi, dibuka di aplikasi peta perangkat. */
export function directionsUrl(koperasi: Pick<Koperasi, 'latitude' | 'longitude'>) {
  return `https://www.google.com/maps/dir/?api=1&destination=${koperasi.latitude},${koperasi.longitude}`;
}

/**
 * Baris meta: rating · jarak · status buka.
 *
 * Tiap bagian hilang sendiri bila datanya tidak ada, sehingga tidak pernah
 * muncul pemisah menggantung seperti "4,8 • • Buka".
 */
export function MetaLine({
  rating,
  distanceLabel,
  isOpen,
}: {
  rating: RatingSummary;
  distanceLabel?: string | null;
  isOpen?: boolean | null;
}) {
  const stars = ratingLabel(rating);
  const parts = [
    stars && (
      <span key="rating" className="kc-meta__rating">
        <Star size={13} aria-hidden="true" />
        {stars}
      </span>
    ),
    distanceLabel && (
      <span key="distance">
        <MapPin size={12} aria-hidden="true" />
        {distanceLabel}
      </span>
    ),
    // Status tidak disampaikan lewat warna saja — teksnya sendiri sudah
    // menyebutkan "Buka" atau "Tutup".
    isOpen != null && (
      <span key="open" className={isOpen ? 'kc-meta__open' : undefined}>
        {isOpen ? 'Buka' : 'Tutup'}
      </span>
    ),
  ].filter(Boolean);

  if (parts.length === 0) {
    return <p className="kc-meta">Belum ada ulasan</p>;
  }

  return (
    <p className="kc-meta">
      {parts.map((part, i) => (
        <span key={i} className="kc-meta__part">
          {i > 0 && <span aria-hidden="true">•</span>}
          {part}
        </span>
      ))}
    </p>
  );
}

export function KopdesCard({
  koperasi,
  wide = false,
}: {
  koperasi: Koperasi;
  wide?: boolean;
}) {
  const detail = `/kopdes/${koperasi.id}`;
  const subtitle =
    koperasi.serviceCategories.length > 0
      ? koperasi.serviceCategories.join(' • ')
      : [koperasi.village, koperasi.district].filter(Boolean).join(', ');

  return (
    <article className={`kc-kopdes${wide ? ' kc-kopdes--wide' : ''}`}>
      <Link href={detail} className="kc-kopdes__media" tabIndex={-1} aria-hidden="true">
        {koperasi.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageThumb(koperasi.imageUrl, 280)} alt="" loading="lazy" />
        ) : (
          <Store size={26} style={{ color: 'var(--muted-soft)' }} />
        )}
      </Link>

      <div className="kc-kopdes__body">
        <h3 className="kc-kopdes__name">
          <Link href={detail}>{koperasi.name}</Link>
          {koperasi.isVerified && (
            <span className="kc-verified" title="Koperasi terverifikasi">
              <span className="visually-hidden">Koperasi terverifikasi</span>
              <BadgeCheck size={14} aria-hidden="true" />
            </span>
          )}
        </h3>

        <MetaLine
          rating={koperasi.rating}
          distanceLabel={koperasi.distanceLabel}
          isOpen={koperasi.isOpen}
        />

        <p className="kc-kopdes__sub">{subtitle}</p>

        <div className="kc-kopdes__acts">
          <Link href={detail} className="kc-btn kc-btn--primary">
            Lihat Kopdes
          </Link>
          {/* Peta dibuka di tab lain: pengguna tidak kehilangan beranda yang
              sudah dimuat hanya karena ingin melihat arah. */}
          <a
            href={directionsUrl(koperasi)}
            target="_blank"
            rel="noreferrer"
            className="kc-btn kc-btn--secondary"
          >
            <Navigation size={14} aria-hidden="true" />
            Petunjuk Arah
          </a>
        </div>
      </div>
    </article>
  );
}

import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { Badge, Card, Message } from '@shared/design/ui';
import {
  BadgeCheck,
  Building2,
  categoryIcon,
  Clock,
  MapPin,
  Navigation,
  Package,
  Phone,
  Store,
  tintAt,
} from '@shared/design/icons';
import { MetaLine, directionsUrl } from '@/components/KopdesCard';
import { MembershipCard } from '@/components/MembershipCard';
import { ProductCard } from '@/components/ProductCard';
import type { KoperasiDetail, MarketplaceProduct } from '@shared/api';

/**
 * Detail satu Kopdes — padanan `KoperasiDetailScreen`.
 *
 * Server component: halaman inilah yang dibagikan lewat tautan, jadi nama dan
 * alamatnya harus sudah ada di HTML tanpa menunggu JavaScript. Jaraknya tidak
 * ikut ditampilkan di sini — jarak butuh koordinat pembuka halaman, dan itu
 * hanya ada di browser.
 */
export const dynamic = 'force-dynamic';

async function getKopdes(id: string): Promise<KoperasiDetail | null> {
  try {
    return await publicApi.getKoperasi(id);
  } catch {
    return null;
  }
}

/**
 * Etalase koperasi: barangnya sendiri dan barang mitra UMKM di bawahnya —
 * itu yang dimaksud "produk yang dijual" sebuah Kopdes.
 *
 * Disaring server lewat `kopdesId`; katalog penuh tidak pernah diunduh lalu
 * dibuang di browser. Gagal memuatnya tidak mengosongkan halaman.
 */
async function getProducts(kopdesId: string): Promise<MarketplaceProduct[]> {
  try {
    const page = await publicApi.getMarketplaceProducts(
      { kopdesId, sellerType: 'ALL', sort: 'newest' },
      1,
      8,
    );
    return page.items;
  } catch {
    return [];
  }
}

/** Nama hari untuk tabel jam operasional, urut mulai Senin. */
const DAYS: [string, string][] = [
  ['mon', 'Senin'],
  ['tue', 'Selasa'],
  ['wed', 'Rabu'],
  ['thu', 'Kamis'],
  ['fri', 'Jumat'],
  ['sat', 'Sabtu'],
  ['sun', 'Minggu'],
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const kopdes = await getKopdes(id);
  if (!kopdes) return { title: 'Kopdes tidak ditemukan — KMP Mitra' };
  return {
    title: `${kopdes.name} — KMP Mitra`,
    description:
      kopdes.description?.slice(0, 150) ??
      `Koperasi desa di ${kopdes.village}, ${kopdes.district}.`,
  };
}

export default async function KopdesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const kopdes = await getKopdes(id);
  const products = kopdes ? await getProducts(id) : [];

  if (!kopdes) {
    return (
      <Message
        title="Kopdes tidak ditemukan"
        body="Tautannya mungkin sudah tidak berlaku, atau koperasinya dinonaktifkan."
        actionLabel="Lihat Daftar Kopdes"
        href="/kopdes"
      />
    );
  }

  const address = [
    kopdes.address,
    [kopdes.village, kopdes.district].filter(Boolean).join(', '),
    [kopdes.city, kopdes.province, kopdes.postalCode].filter(Boolean).join(', '),
  ].filter(Boolean);

  return (
    <div className="stack-lg">
      <div className="kc-kopdes__media kc-kopdes__media--hero">
        {kopdes.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={kopdes.imageUrl} alt="" />
        ) : (
          <Store size={48} style={{ color: 'var(--muted-soft)' }} />
        )}
      </div>

      <div>
        <h1 className="page-title">
          {kopdes.name}
          {kopdes.isVerified && (
            <span className="kc-verified" title="Koperasi terverifikasi">
              <span className="visually-hidden">Koperasi terverifikasi</span>
              <BadgeCheck size={20} aria-hidden="true" />
            </span>
          )}
        </h1>
        <MetaLine rating={kopdes.rating} isOpen={kopdes.isOpen} />
        {kopdes.rating.count > 0 && (
          <p className="page-sub">{kopdes.rating.count} ulasan</p>
        )}
      </div>

      {kopdes.description && <p className="kc-prose">{kopdes.description}</p>}

      <div className="kc-summary kc-summary--two">
        <div className="kc-summary__item">
          <p className="kc-summary__label">
            <Package size={13} aria-hidden="true" />
            Produk
          </p>
          <p className="kc-summary__value">{kopdes.productCount}</p>
        </div>
        <div className="kc-summary__item">
          <p className="kc-summary__label">
            <Building2 size={13} aria-hidden="true" />
            Mitra UMKM
          </p>
          <p className="kc-summary__value">{kopdes.umkmCount}</p>
        </div>
      </div>

      {kopdes.serviceCategories.length > 0 && (
        <section>
          <h2 className="kc-section-head__title">Pelayanan yang Disediakan</h2>
          <div className="kc-services">
            {kopdes.serviceCategories.map((service, i) => {
              const Icon = categoryIcon(service);
              return (
                <span
                  key={service}
                  className="kc-service"
                  style={{ ['--tile-tint' as string]: tintAt(i) }}
                >
                  <span className="kc-service__icon" aria-hidden="true">
                    <Icon size={20} strokeWidth={2.1} />
                  </span>
                  {service}
                </span>
              );
            })}
          </div>
        </section>
      )}

      <OpeningHours hours={kopdes.operatingHours} isOpen={kopdes.isOpen} />

      <MembershipCard
        kopdesId={kopdes.id}
        kopdesName={kopdes.name}
        memberCount={kopdes.memberCount ?? 0}
      />

      {products.length > 0 && (
        <section>
          <div className="kc-section-head">
            <h2 className="kc-section-head__title">Produk yang Dijual</h2>
            <Link
              className="kc-section-head__action"
              href={`/marketplace?kopdesId=${kopdes.id}`}
            >
              Lihat Semua
            </Link>
          </div>
          <div className="kc-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <Card>
        <InfoRow icon={<MapPin size={16} />} label="Alamat">
          {address.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </InfoRow>
        {kopdes.phone && (
          <InfoRow icon={<Phone size={16} />} label="Kontak">
            <a href={`tel:${kopdes.phone}`}>{kopdes.phone}</a>
          </InfoRow>
        )}

      </Card>

      <div className="kc-kopdes__acts">
        <a
          href={directionsUrl(kopdes)}
          target="_blank"
          rel="noreferrer"
          className="kc-btn kc-btn--primary"
        >
          <Navigation size={16} aria-hidden="true" />
          Petunjuk Arah
        </a>
        {kopdes.phone && (
          <a href={`tel:${kopdes.phone}`} className="kc-btn kc-btn--secondary">
            <Phone size={16} aria-hidden="true" />
            Hubungi
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Jam operasional per hari.
 *
 * `null` pada sebuah hari berarti tutup, dan tidak adanya kolom sama sekali
 * berarti pengurus belum mengisinya — dua hal yang berbeda, jadi yang kedua
 * tidak digambar sebagai "tutup setiap hari".
 */
function OpeningHours({
  hours,
  isOpen,
}: {
  hours: KoperasiDetail['operatingHours'];
  isOpen?: boolean | null;
}) {
  if (!hours || Object.keys(hours).length === 0) return null;

  return (
    <section>
      <div className="kc-section-head">
        <h2 className="kc-section-head__title kc-section-head__title--icon">
          <Clock size={17} aria-hidden="true" />
          Jam Operasional
        </h2>
        {isOpen != null && (
          <Badge variant={isOpen ? 'success' : 'muted'}>
            {isOpen ? 'Buka sekarang' : 'Tutup sekarang'}
          </Badge>
        )}
      </div>
      <Card>
        <dl className="kc-hours">
          {DAYS.map(([key, label]) => {
            const day = hours[key];
            return (
              <div key={key} className="kc-hours__row">
                <dt>{label}</dt>
                <dd className={day ? undefined : 'kc-hours__closed'}>
                  {day ? `${day.open} – ${day.close}` : 'Tutup'}
                </dd>
              </div>
            );
          })}
        </dl>
      </Card>
    </section>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="kc-inforow">
      <span className="kc-inforow__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="kc-inforow__label">{label}</p>
        <div className="kc-inforow__value">{children}</div>
      </div>
    </div>
  );
}

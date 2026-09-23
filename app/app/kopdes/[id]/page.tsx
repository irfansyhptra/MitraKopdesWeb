import { publicApi } from '@/lib/api';
import { Card, Message } from '@shared/design/ui';
import {
  BadgeCheck,
  Building2,
  MapPin,
  Navigation,
  Package,
  Phone,
  Store,
  Tag,
} from '@shared/design/icons';
import { MetaLine, directionsUrl } from '@/components/KopdesCard';
import type { KoperasiDetail } from '@shared/api';

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
        {kopdes.serviceCategories.length > 0 && (
          <InfoRow icon={<Tag size={16} />} label="Layanan">
            <span>{kopdes.serviceCategories.join(' • ')}</span>
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

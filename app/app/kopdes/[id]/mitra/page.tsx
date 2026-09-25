import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { Badge, Card, Message } from '@shared/design/ui';
import {
  ArrowLeft,
  categoryIcon,
  MapPin,
  Phone,
  Star,
  Store,
  tintAt,
} from '@shared/design/icons';
import { imageThumb } from '@shared/image';
import { ratingLabel } from '@shared/format';
import type { KoperasiDetail, Mitra, MitraCategory } from '@shared/api';

/**
 * Mitra UMKM yang bernaung di bawah satu Kopdes.
 *
 * Dibuka dari kartu "Mitra UMKM binaan" di halaman detail koperasi. Disaring
 * server lewat `kopdesId`: daftar mitra seluruh desa tidak pernah diunduh
 * lalu dibuang di browser.
 *
 * Server component — halaman ini dibagikan lewat tautan, jadi nama mitranya
 * harus sudah ada di HTML tanpa menunggu JavaScript.
 */
export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<MitraCategory, string> = {
  KULINER: 'Kuliner',
  SWALAYAN: 'Swalayan',
  MINUMAN: 'Minuman',
  KERAJINAN: 'Kerajinan',
  JASA: 'Jasa',
  LAINNYA: 'Lainnya',
};

async function getKopdes(id: string): Promise<KoperasiDetail | null> {
  try {
    return await publicApi.getKoperasi(id);
  } catch {
    return null;
  }
}

type MitraResult =
  | { ok: true; items: Mitra[]; total: number }
  | { ok: false; reason: string };

async function getMitra(kopdesId: string): Promise<MitraResult> {
  try {
    const page = await publicApi.getMitraList(kopdesId, 1, 50);
    return { ok: true, items: page.items, total: page.meta.total };
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const kopdes = await getKopdes(id);
  return {
    title: kopdes
      ? `Mitra UMKM ${kopdes.name} — KMP Mitra`
      : 'Mitra UMKM — KMP Mitra',
    description: kopdes
      ? `Usaha warga yang bernaung di bawah ${kopdes.name}.`
      : undefined,
  };
}

export default async function KopdesMitraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const kopdes = await getKopdes(id);
  const mitra = kopdes ? await getMitra(id) : ({ ok: true, items: [], total: 0 } as MitraResult);

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

  return (
    <div className="stack-lg">
      <div>
        <Link href={`/kopdes/${kopdes.id}`} className="kc-back">
          <ArrowLeft size={16} aria-hidden="true" />
          {kopdes.name}
        </Link>
        <h1 className="page-title">Mitra UMKM</h1>
        <p className="page-sub">
          Usaha warga yang bernaung di bawah {kopdes.name}. Barangnya ikut
          tampil di etalase desa.
        </p>
      </div>

      {!mitra.ok && (
        <p className="kc-empty">
          Daftar mitra belum berhasil dimuat. Coba muat ulang halaman ini.
        </p>
      )}

      {mitra.ok && mitra.items.length === 0 && (
        <p className="kc-empty">
          Belum ada mitra UMKM yang diverifikasi di koperasi ini. Warga yang
          punya usaha bisa mendaftar lewat pengurus koperasi.
        </p>
      )}

      {mitra.ok && mitra.items.length > 0 && (
        <div className="kc-grid kc-grid--wide">
          {mitra.items.map((m, i) => {
            const Icon = categoryIcon(CATEGORY_LABEL[m.category] ?? 'Lainnya');
            return (
              <Card key={m.id} className="kc-mitra">
                <div className="kc-mitra__head">
                  <span
                    className="kc-mitra__avatar"
                    style={{ ['--tile-tint' as string]: tintAt(i) }}
                    aria-hidden="true"
                  >
                    {m.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageThumb(m.photoUrl, 56)} alt="" loading="lazy" />
                    ) : (
                      <Icon size={20} strokeWidth={2.1} />
                    )}
                  </span>
                  <div>
                    <h2 className="kc-mitra__name">{m.businessName}</h2>
                    <p className="kc-mitra__meta">
                      {CATEGORY_LABEL[m.category] ?? 'Lainnya'}
                      {ratingLabel(m.rating) && (
                        <>
                          {' · '}
                          <Star
                            size={12}
                            aria-hidden="true"
                            style={{
                              color: 'var(--yellow-accent)',
                              fill: 'currentColor',
                            }}
                          />{' '}
                          {ratingLabel(m.rating)}
                          {m.rating.count ? ` (${m.rating.count})` : ''}
                        </>
                      )}
                    </p>
                  </div>
                  {/* Status buka ditulis, bukan hanya diberi warna. */}
                  {m.isOpen != null && (
                    <Badge variant={m.isOpen ? 'success' : 'muted'}>
                      {m.isOpen ? 'Buka' : 'Tutup'}
                    </Badge>
                  )}
                </div>

                {m.description && (
                  <p className="kc-mitra__desc">{m.description}</p>
                )}

                <p className="kc-mitra__meta">
                  <MapPin size={12} aria-hidden="true" /> {m.address}
                </p>

                <div className="kc-mitra__foot">
                  <span className="kc-mitra__count">
                    <Store size={13} aria-hidden="true" />
                    {m.productCount ?? 0} barang
                  </span>
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="kc-mitra__call">
                      <Phone size={13} aria-hidden="true" />
                      Hubungi
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {mitra.ok && mitra.items.length > 0 && (
        <Link
          href={`/marketplace?kopdesId=${kopdes.id}&sellerType=UMKM`}
          className="kc-btn kc-btn--secondary kc-btn--block"
        >
          Lihat Barang Mitra di Marketplace
        </Link>
      )}
    </div>
  );
}

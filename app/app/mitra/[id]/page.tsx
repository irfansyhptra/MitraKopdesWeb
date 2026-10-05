/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { MitraChatButton } from '@/components/MitraChatButton';
import { Badge, Card, Message } from '@shared/design/ui';
import { BadgeCheck, MapPin, Phone, Store } from '@shared/design/icons';
import type { Mitra, MarketplaceProduct } from '@shared/api';

export const dynamic = 'force-dynamic';

async function load(id: string): Promise<{ mitra: Mitra; products: MarketplaceProduct[] } | null> {
  try {
    const [mitra, products] = await Promise.all([
      publicApi.getMitra(id),
      publicApi.getMarketplaceProducts({ sellerType: 'UMKM', umkmId: id }, 1, 24),
    ]);
    return { mitra, products: products.items };
  } catch { return null; }
}

export default async function MitraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await load(id);
  if (!data) return <Message title="Mitra tidak ditemukan" body="Toko mungkin belum aktif atau tautannya sudah tidak berlaku." actionLabel="Lihat Mitra Lain" href="/mitra" />;
  const { mitra, products } = data;
  return <div className="stack-lg kc-store-page">
    <section className="kc-store-hero">
      {mitra.photoUrl && <img src={mitra.photoUrl} alt="" />}
      <div className="kc-store-hero__shade" />
      <div className="kc-store-hero__title"><span>Mitra UMKM</span><h1>{mitra.businessName}</h1></div>
    </section>
    <Card className="kc-store-summary">
      <div className="kc-store-summary__head"><div><h2>{mitra.businessName}</h2><p>{mitra.category.replaceAll('_', ' ')}</p></div>{mitra.isOpen != null && <Badge variant={mitra.isOpen ? 'success' : 'muted'}>{mitra.isOpen ? 'Buka' : 'Tutup'}</Badge>}</div>
      <p className="kc-store-meta"><MapPin size={15} />{mitra.address}</p>
      <div className="kc-store-actions">{mitra.userId && <MitraChatButton ownerId={mitra.userId} />}{mitra.phone && <a className="kc-btn kc-btn--secondary" href={`tel:${mitra.phone}`}><Phone size={16} />Hubungi</a>}</div>
    </Card>
    {mitra.kopdes && <Link href={`/kopdes/${mitra.kopdes.id}`} className="kc-store-verified"><BadgeCheck size={22} /><span><strong>Mitra binaan {mitra.kopdes.name}</strong><small>Sudah diverifikasi pengurus koperasi di {mitra.kopdes.village}.</small></span></Link>}
    {mitra.description && <Card><h2 className="kc-section-head__title">Tentang Toko</h2><p className="kc-prose">{mitra.description}</p></Card>}
    <section className="stack-md"><div className="kc-section-head"><div><h2 className="kc-section-head__title">Produk Toko</h2><p className="kc-section-head__sub"><Store size={14} />{products.length} produk ditampilkan</p></div></div>{products.length ? <div className="kc-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="kc-empty">Belum ada produk aktif dari toko ini.</p>}</section>
  </div>;
}

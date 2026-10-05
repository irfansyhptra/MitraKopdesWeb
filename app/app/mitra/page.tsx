/* eslint-disable @next/next/no-img-element */
import { publicApi } from '@/lib/api';
import { Badge, Card, Message } from '@shared/design/ui';
import { categoryIcon, MapPin, Phone, Store, tintAt } from '@shared/design/icons';
import { imageThumb } from '@shared/image';

export const dynamic = 'force-dynamic';

export default async function MitraListPage() {
  const result = await publicApi.getMitraList(undefined, 1, 50).catch(() => null);
  if (!result) return <Message title="Daftar mitra belum berhasil dimuat" body="Coba muat ulang halaman ini." actionLabel="Kembali ke Beranda" href="/" />;
  return <div className="stack-lg">
    <header><h1 className="page-title">Mitra UMKM</h1><p className="page-sub">Usaha warga yang telah diverifikasi dan terhubung dengan KMP Mitra.</p></header>
    {!result.items.length && <p className="kc-empty">Belum ada mitra UMKM yang aktif.</p>}
    <div className="kc-grid kc-grid--wide">{result.items.map((mitra, index) => {
      const Icon = categoryIcon(mitra.category);
      return <Card className="kc-mitra" key={mitra.id}>
        <div className="kc-mitra__head"><span className="kc-mitra__avatar" style={{ ['--tile-tint' as string]: tintAt(index) }}>{mitra.photoUrl ? <img src={imageThumb(mitra.photoUrl, 56)} alt="" loading="lazy" /> : <Icon size={20} />}</span><div><h2 className="kc-mitra__name">{mitra.businessName}</h2><p className="kc-mitra__meta">{mitra.category.replaceAll('_', ' ')}</p></div>{mitra.isOpen != null && <Badge variant={mitra.isOpen ? 'success' : 'muted'}>{mitra.isOpen ? 'Buka' : 'Tutup'}</Badge>}</div>
        {mitra.description && <p className="kc-mitra__desc">{mitra.description}</p>}
        <p className="kc-mitra__meta"><MapPin size={12} />{mitra.address}</p>
        <div className="kc-mitra__foot"><span className="kc-mitra__count"><Store size={13} />{mitra.productCount ?? 0} barang</span>{mitra.phone && <a href={`tel:${mitra.phone}`} className="kc-mitra__call"><Phone size={13} />Hubungi</a>}</div>
      </Card>;
    })}</div>
  </div>;
}

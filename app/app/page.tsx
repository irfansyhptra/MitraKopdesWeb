import Link from 'next/link';
import { publicApi } from '@/lib/api';
import type { Product } from '@shared/api';

// Marketplace (server component) — mengambil produk publik dari backend.
export const dynamic = 'force-dynamic'; // selalu data terbaru saat dev

function rupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

async function getProducts(): Promise<{ products: Product[]; error?: string }> {
  try {
    const res = await publicApi.getProducts({ limit: 24, isActive: 'true' });
    return { products: res.products ?? [] };
  } catch (e) {
    return { products: [], error: (e as Error).message };
  }
}

export default async function MarketplacePage() {
  const { products, error } = await getProducts();

  return (
    <>
      <h1 className="page-title">Marketplace KOPDES</h1>
      <p className="page-sub">Produk koperasi &amp; UMKM desa.</p>

      {error && (
        <div className="state">
          Gagal memuat produk dari server.
          <br />
          <span className="muted">{error}</span>
        </div>
      )}

      {!error && products.length === 0 && (
        <div className="empty">Belum ada produk tersedia.</div>
      )}

      <div className="products">
        {products.map((p) => {
          const img = p.images?.find((i) => i.isPrimary) ?? p.images?.[0];
          return (
            <Link className="product" key={p.id} href={`/product/${p.id}`}>
              <div className="thumb">
                {img ? <img src={img.url} alt={p.name} /> : '📦'}
              </div>
              <div className="info">
                <div className="name">{p.name}</div>
                <div className="price">{rupiah(p.price)}</div>
                <div className="stock">Stok: {p.stock}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

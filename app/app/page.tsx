import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { Badge, Card, Message, SectionHeader } from '@shared/design/ui';
import { formatRupiah, toRupiah } from '@shared/format';
import type { MarketplaceProduct } from '@shared/api';

/**
 * Beranda pelanggan — padanan `HomeScreen` pada aplikasi Flutter.
 *
 * Server component: isi beranda seluruhnya data publik, jadi HTML-nya bisa
 * dikirim sudah terisi. Tidak ada gunanya menunggu JavaScript hanya untuk
 * menampilkan daftar produk yang tidak bergantung pada siapa yang membuka.
 */

export const revalidate = 60;

async function safe<T>(work: Promise<T>, fallback: T): Promise<T> {
  try {
    return await work;
  } catch {
    // Satu bagian yang gagal tidak boleh mengosongkan seluruh beranda —
    // pola yang sama dipakai section-section di HomeScreen.
    return fallback;
  }
}

export default async function HomePage() {
  const [featured, bestSellers] = await Promise.all([
    safe(
      publicApi
        .getMarketplaceProducts({ sellerType: 'umkm', sort: 'rating' }, 1, 6)
        .then((r) => r.items),
      [] as MarketplaceProduct[],
    ),
    safe(
      publicApi
        .getMarketplaceProducts({ sellerType: 'all', sort: 'relevance' }, 1, 6)
        .then((r) => r.items),
      [] as MarketplaceProduct[],
    ),
  ]);

  const empty = featured.length === 0 && bestSellers.length === 0;

  return (
    <div className="stack-lg">
      <section>
        <div className="page-head">
          <div className="page-head__text">
            <h1 className="page-title">Selamat datang di KMP Mitra</h1>
            <p className="page-sub">
              Belanja barang Kopdes dan Mitra UMKM di desamu.
            </p>
          </div>
        </div>

        <Card className="stack-md">
          <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
            <Badge variant="primary">KOPERASI DESA DIGITAL</Badge>
            <Badge variant="success">Transaksi terlindungi</Badge>
          </div>
          <p className="t-body-md">
            Satu desa, satu Kopdes. Barang koperasi dan mitra UMKM dalam satu
            etalase, diantar kurir desa atau diambil langsung di tempat.
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
            <Link href="/marketplace" className="kc-btn kc-btn--primary">
              Mulai Belanja
            </Link>
            <Link href="/orders" className="kc-btn kc-btn--secondary">
              Lihat Pesanan
            </Link>
          </div>
        </Card>
      </section>

      {empty && (
        <Message
          title="Produk belum tersedia"
          body="Katalog desa belum terisi, atau server belum bisa dihubungi."
          actionLabel="Buka Marketplace"
          href="/marketplace"
        />
      )}

      {bestSellers.length > 0 && (
        <section>
          <SectionHeader
            title="Produk Terlaris"
            actionLabel="Lihat Semua"
            href="/marketplace"
          />
          <ProductRow products={bestSellers} />
        </section>
      )}

      {featured.length > 0 && (
        <section>
          <SectionHeader
            title="Produk UMKM Pilihan"
            actionLabel="Lihat Semua"
            href="/marketplace?sellerType=umkm"
          />
          <ProductRow products={featured} />
        </section>
      )}
    </div>
  );
}

function ProductRow({ products }: { products: MarketplaceProduct[] }) {
  return (
    <div className="kc-grid">
      {products.map((product) => {
        const price = toRupiah(product.price);
        const discount = product.discountPrice
          ? toRupiah(product.discountPrice)
          : 0;
        const hasDiscount = discount > 0 && discount < price;
        const href =
          product.sellerType === 'UMKM'
            ? `/umkm-product/${product.id}`
            : `/product/${product.id}`;

        return (
          <Link href={href} key={product.id} className="kc-product kc-card--tap">
            <div className="kc-product__media">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} loading="lazy" />
              ) : (
                <span aria-hidden="true">📦</span>
              )}
            </div>
            <div className="kc-product__body">
              <p className="kc-product__name">{product.name}</p>
              <p className="kc-product__seller">{product.sellerName}</p>
              <p className="kc-product__price">
                {formatRupiah(hasDiscount ? discount : price)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

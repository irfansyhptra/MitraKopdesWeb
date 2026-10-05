import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { HomeHero } from '@/components/HomeHero';
import { NearbyKopdes } from '@/components/NearbyKopdes';
import { Message, SectionHeader } from '@shared/design/ui';
import {
  ChevronRight,
  categoryIcon,
  Handshake,
  Package,
  Store,
  Truck,
  tintAt,
} from '@shared/design/icons';
import { formatRupiah, toRupiah } from '@shared/format';
import type { Banner, Category, DiscoveryProduct } from '@shared/api';

export const revalidate = 60;

async function safe<T>(work: Promise<T>, fallback: T): Promise<T> {
  try {
    return await work;
  } catch {
    return fallback;
  }
}

/**
 * Beranda pelanggan memakai endpoint discovery khusus agar label “pilihan”
 * dan “terlaris” mencerminkan data backend, bukan sekadar produk terbaru.
 * Setiap seksi gagal secara mandiri sehingga satu endpoint yang bermasalah
 * tidak menjatuhkan seluruh halaman.
 */
export default async function HomePage() {
  const [bestSellers, featured, categories, banners] = await Promise.all([
    safe(publicApi.getBestSellers(8, '30d'), [] as DiscoveryProduct[]),
    safe(publicApi.getFeaturedUmkmProducts(8), [] as DiscoveryProduct[]),
    safe(publicApi.getCategories(), [] as Category[]),
    safe(publicApi.getBanners(), [] as Banner[]),
  ]);

  const productsEmpty = bestSellers.length === 0 && featured.length === 0;

  return (
    <div className="home-page">
      <HomeHero>
        <NearbyKopdes />
      </HomeHero>

      {banners[0] && <PromoBanner banner={banners[0]} />}

      {categories.length > 0 && (
        <section className="home-section">
          <SectionHeader
            title="Kategori"
            actionLabel="Lihat Semua"
            href="/marketplace"
          />
          <div className="catgrid">
            {categories.slice(0, 9).map((category, index) => {
              const Icon = categoryIcon(category.name);
              return (
                <Link
                  key={category.id}
                  href={`/marketplace?categoryId=${category.id}`}
                  className="catgrid__item"
                >
                  <span
                    className="catgrid__icon"
                    style={{ ['--tile-tint' as string]: tintAt(index) }}
                    aria-hidden="true"
                  >
                    <Icon size={22} strokeWidth={2} />
                  </span>
                  <span className="catgrid__label">{category.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <ProductSection
          title="Produk UMKM Pilihan"
          href="/marketplace?sellerType=UMKM"
          products={featured}
        />
      )}

      {bestSellers.length > 0 && (
        <ProductSection
          title="Produk Terlaris"
          href="/marketplace"
          products={bestSellers}
          showRank
        />
      )}

      {productsEmpty && (
        <Message
          title="Produk belum tersedia"
          body="Katalog desa belum terisi, atau server belum bisa dihubungi."
          actionLabel="Buka Marketplace"
          href="/marketplace"
        />
      )}

      <section className="home-community">
        <div>
          <span className="home-community__eyebrow">Belanja dekat, dampak lebih besar</span>
          <h2>Belanja Lokal, Desa Lebih Kuat</h2>
          <p>
            Setiap transaksi membantu Kopdes dan pelaku UMKM tumbuh bersama
            warga di sekitarnya.
          </p>
        </div>
        <Link href="/marketplace" className="kc-btn kc-btn--primary">
          Mulai Belanja
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </section>

      <section className="home-member-banner">
        <span className="home-member-banner__icon" aria-hidden="true">
          <Handshake size={25} />
        </span>
        <div>
          <h2>Jadi anggota KMP Mitra</h2>
          <p>
            Masuk ke profil, pilih Kopdes, lalu ajukan keanggotaan untuk
            menikmati layanan koperasi desamu.
          </p>
        </div>
        <Link href="/profile" className="kc-btn kc-btn--secondary">
          Daftar Anggota
        </Link>
      </section>
    </div>
  );
}

function ProductSection({
  title,
  href,
  products,
  showRank = false,
}: {
  title: string;
  href: string;
  products: DiscoveryProduct[];
  showRank?: boolean;
}) {
  return (
    <section className="home-section">
      <SectionHeader title={title} actionLabel="Lihat Semua" href={href} />
      <div className="home-product-grid">
        {products.slice(0, 8).map((product) => (
          <DiscoveryProductCard
            key={`${product.source}-${product.id}`}
            product={product}
            showRank={showRank}
          />
        ))}
      </div>
    </section>
  );
}

function DiscoveryProductCard({
  product,
  showRank,
}: {
  product: DiscoveryProduct;
  showRank: boolean;
}) {
  const detail =
    product.source === 'UMKM'
      ? `/umkm-product/${product.id}`
      : `/product/${product.id}`;

  return (
    <Link href={detail} className="home-product-card">
      <div className="home-product-card__media">
        {showRank && product.rank && (
          <span className="home-product-card__rank">#{product.rank}</span>
        )}
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
        ) : (
          <Package size={32} aria-hidden="true" />
        )}
      </div>
      <div className="home-product-card__body">
        <p className="home-product-card__source">
          {product.source === 'UMKM' ? 'UMKM' : 'Kopdes'}
        </p>
        <h3>{product.name}</h3>
        <p className="home-product-card__seller">{product.sellerName}</p>
        <div className="home-product-card__foot">
          <strong>{formatRupiah(toRupiah(product.price))}</strong>
          {product.soldCount != null && (
            <span>{product.soldCount} terjual</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function PromoBanner({ banner }: { banner: Banner }) {
  const href =
    banner.ctaRoute && !['/products', '/umkm'].includes(banner.ctaRoute)
      ? banner.ctaRoute
      : '/marketplace';

  return (
    <section className="home-promo">
      <span className="home-promo__icon" aria-hidden="true">
        {banner.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner.imageUrl} alt="" />
        ) : (
          <Truck size={28} />
        )}
      </span>
      <div className="home-promo__copy">
        {banner.badge && <span className="home-promo__badge">{banner.badge}</span>}
        <h2>
          {banner.title}
          {banner.highlight && <em> {banner.highlight}</em>}
        </h2>
        {banner.description && <p>{banner.description}</p>}
      </div>
      <Link href={href} className="home-promo__action">
        {banner.ctaLabel ?? 'Lihat Sekarang'}
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
      <Store className="home-promo__watermark" size={128} aria-hidden="true" />
    </section>
  );
}

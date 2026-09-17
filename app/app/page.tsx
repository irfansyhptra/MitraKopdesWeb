import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { HomeHero } from '@/components/HomeHero';
import { Card, Message, SectionHeader } from '@shared/design/ui';
import {
  categoryIcon,
  Handshake,
  Package,
  Store,
  tintAt,
} from '@shared/design/icons';
import { formatRupiah, toRupiah } from '@shared/format';
import type { Category, MarketplaceProduct } from '@shared/api';

/**
 * Beranda pelanggan — padanan `HomeScreen` pada aplikasi Flutter.
 *
 * Urutan seksinya sama dengan versi mobile: header + pencarian, ringkasan
 * keanggotaan, kategori, Promo Terbaik, Produk UMKM Pilihan, Produk Terlaris,
 * lalu dua banner ajakan di kaki halaman.
 *
 * Server component untuk semua yang tidak bergantung pada pembukanya. Tiap
 * seksi memanggil datanya lewat `safe()`, jadi satu bagian yang gagal tidak
 * mengosongkan beranda — perilaku yang sama dengan section-section di
 * `HomeScreen` yang masing-masing punya state sendiri.
 */

export const revalidate = 60;

async function safe<T>(work: Promise<T>, fallback: T): Promise<T> {
  try {
    return await work;
  } catch {
    return fallback;
  }
}

export default async function HomePage() {
  const [bestSellers, featured, categories] = await Promise.all([
    safe(
      publicApi
        .getMarketplaceProducts({ sellerType: 'all', sort: 'relevance' }, 1, 8)
        .then((r) => r.items),
      [] as MarketplaceProduct[],
    ),
    safe(
      publicApi
        .getMarketplaceProducts({ sellerType: 'umkm', sort: 'rating' }, 1, 8)
        .then((r) => r.items),
      [] as MarketplaceProduct[],
    ),
    safe(publicApi.getCategories(), [] as Category[]),
  ]);

  // "Promo Terbaik" diambil dari produk yang memang punya harga diskon.
  // Versi mobile memakai empat produk contoh yang ditulis tetap di dalam kode
  // ("Beras Premium", gambar picsum) — itu etalase yang tidak bisa dibeli,
  // jadi di sini seksinya hilang kalau tidak ada diskon sungguhan.
  const promos = [...bestSellers, ...featured].filter((p) => {
    const price = toRupiah(p.price);
    const cut = p.discountPrice ? toRupiah(p.discountPrice) : 0;
    return cut > 0 && cut < price;
  });

  const empty = bestSellers.length === 0 && featured.length === 0;

  return (
    <div className="stack-lg">
      <HomeHero />

      {categories.length > 0 && (
        <section>
          <SectionHeader
            title="Kategori"
            actionLabel="Semua"
            href="/marketplace"
          />
          <div className="kc-rail">
            {categories.map((cat, i) => {
              const Icon = categoryIcon(cat.name);
              return (
                <Link
                  key={cat.id}
                  href={`/marketplace?categoryId=${cat.id}`}
                  className="kc-tile"
                >
                  <span
                    className="kc-tile__icon"
                    style={{ ['--tile-tint' as string]: tintAt(i) }}
                    aria-hidden="true"
                  >
                    <Icon size={22} strokeWidth={2.1} />
                  </span>
                  <span className="kc-tile__label">{cat.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {empty && (
        <Message
          title="Produk belum tersedia"
          body="Katalog desa belum terisi, atau server belum bisa dihubungi."
          actionLabel="Buka Marketplace"
          href="/marketplace"
        />
      )}

      {promos.length > 0 && (
        <section>
          <SectionHeader
            title="Promo Terbaik"
            actionLabel="Semua"
            href="/marketplace"
          />
          <div className="kc-rail kc-rail--wrap">
            {promos.slice(0, 8).map((product) => (
              <PromoTile key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section>
          <SectionHeader
            title="Produk UMKM Pilihan"
            actionLabel="Semua"
            href="/marketplace?sellerType=umkm"
          />
          <div className="kc-rail kc-rail--wrap">
            {featured.slice(0, 6).map((product) => (
              <PromoTile key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {bestSellers.length > 0 && (
        <section>
          <SectionHeader
            title="Produk Terlaris"
            actionLabel="Semua"
            href="/marketplace"
          />
          <div className="kc-grid">
            {bestSellers.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <Card pad={false}>
        <Link href="/marketplace" className="kc-banner">
          <span className="kc-banner__icon" aria-hidden="true">
            <Store size={22} />
          </span>
          <span>
            <span className="kc-banner__title">Belanja di desa sendiri</span>
            <span className="kc-banner__body">
              Barang Kopdes dan mitra UMKM, diantar kurir desa atau diambil
              langsung tanpa antre.
            </span>
          </span>
        </Link>
      </Card>

      <Card pad={false}>
        <Link href="/profile" className="kc-banner kc-banner--soft">
          <span className="kc-banner__icon" aria-hidden="true">
            <Handshake size={22} />
          </span>
          <span>
            <span className="kc-banner__title">Jadi mitra UMKM Kopdes</span>
            <span className="kc-banner__body">
              Daftarkan usahamu lewat koperasi desa dan jual barangmu di
              etalase yang sama.
            </span>
          </span>
        </Link>
      </Card>
    </div>
  );
}

function hrefFor(product: MarketplaceProduct): string {
  return product.sellerType === 'UMKM'
    ? `/umkm-product/${product.id}`
    : `/product/${product.id}`;
}

/** Kartu ringkas untuk rail mendatar — padanan `AppleProductTile`. */
function PromoTile({ product }: { product: MarketplaceProduct }) {
  const price = toRupiah(product.price);
  const cut = product.discountPrice ? toRupiah(product.discountPrice) : 0;
  const hasDiscount = cut > 0 && cut < price;
  const off = hasDiscount ? Math.round(((price - cut) / price) * 100) : 0;

  return (
    <Link href={hrefFor(product)} className="kc-promo kc-card--tap">
      <div className="kc-promo__media">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
        ) : (
          <Package size={30} aria-hidden="true" style={{ color: 'var(--muted-soft)' }} />
        )}
        {off > 0 && <span className="kc-promo__badge">-{off}%</span>}
      </div>
      <div className="kc-promo__body">
        <p className="kc-promo__name">{product.name}</p>
        <p className="kc-promo__sub">{product.sellerName}</p>
        <p className="kc-promo__price">
          {formatRupiah(hasDiscount ? cut : price)}
          {hasDiscount && (
            <>
              {' '}
              <span className="kc-product__strike">{formatRupiah(price)}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

function ProductCard({ product }: { product: MarketplaceProduct }) {
  const price = toRupiah(product.price);
  const cut = product.discountPrice ? toRupiah(product.discountPrice) : 0;
  const hasDiscount = cut > 0 && cut < price;

  return (
    <Link href={hrefFor(product)} className="kc-product kc-card--tap">
      <div className="kc-product__media">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
        ) : (
          <Package size={30} aria-hidden="true" style={{ color: 'var(--muted-soft)' }} />
        )}
      </div>
      <div className="kc-product__body">
        <p className="kc-product__name">{product.name}</p>
        <p className="kc-product__seller">{product.sellerName}</p>
        <p className="kc-product__price">
          {formatRupiah(hasDiscount ? cut : price)}
        </p>
      </div>
    </Link>
  );
}

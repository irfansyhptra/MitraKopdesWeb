'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  Badge,
  Chip,
  Message,
  ProductGridSkeleton,
  SectionHeader,
  SellerBadge,
} from '@shared/design/ui';
import { formatRupiah, toRupiah } from '@shared/format';
import type {
  Category,
  MarketplaceFilter,
  MarketplaceProduct,
  MarketplaceSellerType,
  MarketplaceSort,
} from '@shared/api';

/**
 * Marketplace — padanan `MarketplaceScreen` pada aplikasi Flutter.
 *
 * Filter dikirim ke server, bukan disaring di browser: menyaring satu halaman
 * secara lokal memberi hasil salah begitu katalog lebih panjang daripada satu
 * halaman, dan tetap mengunduh baris yang akhirnya dibuang.
 *
 * Deret tile kategori dipisah Makanan/Barang Ritel memakai `group` dari
 * backend — pembagian yang sama dengan `foodCategoriesProvider` dan
 * `retailCategoriesProvider` di aplikasi mobile.
 */

const SELLER_TABS: { id: MarketplaceSellerType; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'kopdes', label: 'Barang Kopdes' },
  { id: 'umkm', label: 'Mitra UMKM' },
];

const SORTS: { id: MarketplaceSort; label: string }[] = [
  { id: 'relevance', label: 'Paling Sesuai' },
  { id: 'price_asc', label: 'Termurah' },
  { id: 'price_desc', label: 'Termahal' },
  { id: 'rating', label: 'Rating' },
];

const PAGE_SIZE = 20;

/** Ikon tile kategori; nama datang dari backend jadi pencocokannya longgar. */
const CATEGORY_ICONS: [RegExp, string][] = [
  [/sembako|beras|bahan/i, '🍚'],
  [/minum|kopi|teh/i, '🥤'],
  [/instan|mie|makan/i, '🍜'],
  [/rawat|mandi|bersih/i, '🧼'],
  [/kosmetik|cantik/i, '💄'],
  [/sayur|buah|segar/i, '🥬'],
];

const TILE_TINTS = [
  '#ffebee',
  '#e7f6ec',
  '#fff6e0',
  '#f0e8ff',
  '#e3f0ff',
  '#fdeaf4',
];

function iconFor(name: string): string {
  return CATEGORY_ICONS.find(([re]) => re.test(name))?.[1] ?? '🛍️';
}

export default function MarketplacePage() {
  // `useSearchParams` menuntut Suspense saat prerender; beranda menautkan
  // ke sini dengan `?q=`, `?categoryId=`, dan `?sellerType=`.
  return (
    <Suspense fallback={<ProductGridSkeleton count={8} />}>
      <MarketplaceBrowser />
    </Suspense>
  );
}

function MarketplaceBrowser() {
  const params = useSearchParams();
  const initialQuery = params?.get('q') ?? '';

  const [filter, setFilter] = useState<MarketplaceFilter>(() => ({
    sellerType: (params?.get('sellerType') as MarketplaceSellerType) ?? 'all',
    sort: 'relevance',
    categoryId: params?.get('categoryId') ?? undefined,
    search: initialQuery || undefined,
  }));
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [categories, setCategories] = useState<Category[]>([]);

  const [items, setItems] = useState<MarketplaceProduct[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Permintaan yang sudah tidak relevan tidak boleh menimpa hasil terbaru:
  // mengetik cepat membuat beberapa permintaan berjalan bersamaan, dan yang
  // paling lambat pulang bisa saja permintaan yang paling awal dikirim.
  const requestId = useRef(0);

  const load = useCallback(
    async (nextFilter: MarketplaceFilter) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const res = await api.getMarketplaceProducts(nextFilter, 1, PAGE_SIZE);
        if (id !== requestId.current) return;
        setItems(res.items);
        setPage(res.meta.page);
        setTotalPages(res.meta.totalPages);
      } catch (e) {
        if (id !== requestId.current) return;
        setError((e as Error).message);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [],
  );

  // Pencarian ditunda 350 ms: satu permintaan per kata, bukan per ketukan.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter((f) => ({ ...f, search: searchInput.trim() || undefined }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  useEffect(() => {
    let cancelled = false;
    api
      .getCategories()
      .then((list) => {
        if (!cancelled) setCategories(list ?? []);
      })
      // Kategori gagal dimuat bukan alasan mengosongkan seluruh halaman;
      // barisnya cukup tidak digambar.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMore() {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const res = await api.getMarketplaceProducts(
        filter,
        page + 1,
        PAGE_SIZE,
      );
      setItems((prev) => [...prev, ...res.items]);
      setPage(res.meta.page);
      setTotalPages(res.meta.totalPages);
    } catch {
      // Produk yang sudah tampil tetap di layar; tombolnya bisa ditekan lagi.
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = page < totalPages;

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Marketplace</h1>
          <p className="page-sub">
            Barang Kopdes dan Mitra UMKM di desamu.
          </p>
        </div>
      </div>

      <div className="filterbar">
        <div className="searchbox">
          <span aria-hidden="true">🔍</span>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari beras, minyak, kue…"
            aria-label="Cari produk"
          />
        </div>

        <div className="filterbar__row" role="tablist" aria-label="Jenis penjual">
          {SELLER_TABS.map((tab) => (
            <Chip
              key={tab.id}
              selected={filter.sellerType === tab.id}
              onClick={() => setFilter((f) => ({ ...f, sellerType: tab.id }))}
            >
              {tab.label}
            </Chip>
          ))}
        </div>

        <div className="filterbar__row" aria-label="Urutan">
          {SORTS.map((sort) => (
            <Chip
              key={sort.id}
              selected={filter.sort === sort.id}
              onClick={() => setFilter((f) => ({ ...f, sort: sort.id }))}
            >
              {sort.label}
            </Chip>
          ))}
        </div>
      </div>

      <CategoryRow
        title="Filter Makanan"
        icon="🍽️"
        categories={categories.filter((c) => c.group === 'FOOD')}
        selectedId={filter.categoryId ?? null}
        onSelect={(id) => setFilter((f) => ({ ...f, categoryId: id }))}
      />

      <CategoryRow
        title="Filter Barang Ritel"
        icon="🧺"
        categories={categories.filter((c) => c.group === 'RETAIL')}
        selectedId={filter.categoryId ?? null}
        onSelect={(id) => setFilter((f) => ({ ...f, categoryId: id }))}
      />

      {loading && <ProductGridSkeleton count={8} />}

      {!loading && error && (
        <Message
          title="Produk belum berhasil dimuat"
          body={error}
          actionLabel="Coba Lagi"
          onAction={() => void load(filter)}
        />
      )}

      {!loading && !error && items.length === 0 && (
        <Message
          title="Produk belum ditemukan"
          body="Coba ubah kata pencarian atau pilih kategori lain."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="kc-grid">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 'var(--sp-lg)' }}>
              <button
                type="button"
                className="kc-btn kc-btn--secondary"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore ? 'Memuat…' : 'Muat produk lainnya'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

/**
 * Deret tile kategori — padanan `CategoryFilterRow` di mobile.
 *
 * Menekan tile yang sedang aktif melepas filternya, jadi tidak perlu tombol
 * "Semua Kategori" terpisah; itu juga perilaku `onSelected(null)` di Dart.
 */
function CategoryRow({
  title,
  icon,
  categories,
  selectedId,
  onSelect,
}: {
  title: string;
  icon: string;
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  if (categories.length === 0) return null;

  return (
    <section style={{ marginTop: 'var(--sp-lg)' }}>
      <SectionHeader title={`${icon} ${title}`} />
      <div className="kc-rail">
        {categories.map((cat, i) => {
          const active = selectedId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              className="kc-tile"
              aria-selected={active}
              onClick={() => onSelect(active ? null : cat.id)}
            >
              <span
                className="kc-tile__icon"
                style={{
                  ['--tile-tint' as string]: TILE_TINTS[i % TILE_TINTS.length],
                }}
                aria-hidden="true"
              >
                {iconFor(cat.name)}
              </span>
              <span className="kc-tile__label">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: MarketplaceProduct }) {
  const price = toRupiah(product.price);
  const discount = product.discountPrice ? toRupiah(product.discountPrice) : 0;
  const hasDiscount = discount > 0 && discount < price;
  const outOfStock = product.stock <= 0;

  const href =
    product.sellerType === 'UMKM'
      ? `/umkm-product/${product.id}`
      : `/product/${product.id}`;

  return (
    <Link href={href} className="kc-product kc-card--tap">
      <div className="kc-product__media">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
        ) : (
          <span aria-hidden="true">📦</span>
        )}
      </div>
      <div className="kc-product__body">
        <div
          style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}
        >
          <SellerBadge kind={product.sellerType} />
          {/* Stok habis ditulis, bukan hanya diberi warna — warna saja tidak
              terbaca pengguna yang buta warna. */}
          {outOfStock && <Badge variant="muted">Stok habis</Badge>}
        </div>
        <p className="kc-product__name">{product.name}</p>
        <p className="kc-product__seller">{product.sellerName}</p>
        {product.rating != null && product.rating > 0 && (
          <p className="kc-product__seller">
            ★ {product.rating.toFixed(1)}
            {product.reviewCount ? ` (${product.reviewCount})` : ''}
          </p>
        )}
        <p className="kc-product__price">
          {formatRupiah(hasDiscount ? discount : price)}
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

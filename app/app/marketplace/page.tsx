'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, publicApi } from '@/lib/api';
import { Message, ProductGridSkeleton } from '@shared/design/ui';
import {
  ArrowLeft,
  Building2,
  categoryIcon,
  LayoutGrid,
  MapPin,
  Navigation,
  Search,
  ShoppingBasket,
  SlidersHorizontal,
  Store,
  tintAt,
  type LucideIcon,
} from '@shared/design/icons';
import { readSellerType } from './readSellerType';
import { MarketplaceFilterSheet } from './FilterSheet';
import { ProductCard } from '@/components/ProductCard';
import type {
  Banner,
  Category,
  MarketplaceFilter,
  MarketplaceProduct,
  MarketplaceSellerType,
} from '@shared/api';

/**
 * Marketplace — padanan `MarketplaceScreen` pada aplikasi Flutter, termasuk
 * urutan sectionnya: iklan utama, pencarian + filter, Filter Makanan, Filter
 * Barang Ritel, Pilih Tempat Belanja, lalu Rekomendasi Untukmu.
 *
 * Filter dikirim ke server, bukan disaring di browser: menyaring satu halaman
 * secara lokal memberi hasil salah begitu katalog lebih panjang daripada satu
 * halaman, dan tetap mengunduh baris yang akhirnya dibuang.
 *
 * Yang sengaja tidak ditiru dari mobile: tombol favorit. Di aplikasi favorit
 * tersimpan lewat ApiCache; di web belum ada penyimpanannya, dan hati yang
 * tidak menyimpan apa pun lebih buruk daripada tidak ada hati sama sekali.
 */

/** Sumber produk. "Terdekat" butuh koordinat, jadi ia bukan sellerType. */
type SourceTab = MarketplaceSellerType | 'NEAREST';

const SOURCES: { id: SourceTab; label: string; icon: LucideIcon }[] = [
  { id: 'ALL', label: 'Semua', icon: Store },
  { id: 'KOPDES', label: 'Kopdes', icon: Building2 },
  { id: 'UMKM', label: 'Mitra UMKM', icon: ShoppingBasket },
  { id: 'NEAREST', label: 'Terdekat', icon: Navigation },
];

const PAGE_SIZE = 20;

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
    sellerType: readSellerType(params?.get('sellerType')),
    sort: 'newest',
    categoryId: params?.get('categoryId') ?? undefined,
    // Halaman detail Kopdes menautkan ke sini dengan `?kopdesId=`, jadi
    // "Lihat Semua" tetap menampilkan etalase desa itu saja.
    kopdesId: params?.get('kopdesId') ?? undefined,
    search: initialQuery || undefined,
  }));
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

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

  const load = useCallback(async (nextFilter: MarketplaceFilter) => {
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
  }, []);

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
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMore() {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const res = await api.getMarketplaceProducts(filter, page + 1, PAGE_SIZE);
      setItems((prev) => [...prev, ...res.items]);
      setPage(res.meta.page);
      setTotalPages(res.meta.totalPages);
    } catch {
      // Produk yang sudah tampil tetap di layar; tombolnya bisa ditekan lagi.
    } finally {
      setLoadingMore(false);
    }
  }

  /**
   * "Terdekat" hanya bisa dipakai setelah koordinat ada: server menolak
   * `sort=distance` tanpa koordinat yang sah. Izinnya diminta saat tombolnya
   * ditekan — bukan saat halaman dibuka, karena peramban menghukum permintaan
   * yang tidak dipicu pengguna — dan filternya baru berubah setelah
   * koordinatnya benar-benar datang.
   */
  function selectSource(next: SourceTab) {
    if (next !== 'NEAREST') {
      setFilter((f) => ({ ...f, sellerType: next, sort: 'newest' }));
      return;
    }

    if (filter.latitude != null && filter.longitude != null) {
      setFilter((f) => ({ ...f, sellerType: 'ALL', sort: 'distance' }));
      return;
    }

    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setLocationDenied(false);
        setFilter((f) => ({
          ...f,
          sellerType: 'ALL',
          sort: 'distance',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
      },
      // Menolak berbagi lokasi bukan kesalahan pengguna: urutannya tetap
      // seperti sebelumnya, hanya diberi keterangan.
      () => {
        setLocating(false);
        setLocationDenied(true);
      },
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  function resetFilter() {
    setSearchInput('');
    // Lingkup koperasi berasal dari tautan, bukan dari filter yang dipilih
    // pengguna — melepasnya diam-diam akan menampilkan katalog seluruh desa.
    setFilter((f) => ({
      sellerType: 'ALL',
      sort: 'newest',
      kopdesId: f.kopdesId,
    }));
  }

  const hasMore = page < totalPages;
  const source: SourceTab =
    filter.sort === 'distance' ? 'NEAREST' : (filter.sellerType ?? 'ALL');

  return (
    <div className="stack-lg">
      <PromoBanner />

      <div className="kc-searchrow">
        <label className="kc-hero__field">
          <Search size={18} aria-hidden="true" />
          <span className="visually-hidden">Cari produk</span>
          <input
            type="search"
            name="q"
            // Kolom pencarian bukan kolom data pribadi: pelengkapan otomatis
            // dan pemeriksaan ejaan hanya mengganggu.
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari produk kebutuhanmu…"
          />
        </label>
        <button
          type="button"
          className="kc-iconbtn kc-iconbtn--outline"
          onClick={() => setSheetOpen(true)}
          aria-label="Filter produk"
        >
          <SlidersHorizontal size={19} aria-hidden="true" />
        </button>
      </div>

      <CategoryRow
        title="Filter Makanan"
        loading={categoriesLoading}
        categories={categories.filter((c) => c.group === 'FOOD')}
        selectedId={filter.categoryId ?? null}
        onSelect={(id) => setFilter((f) => ({ ...f, categoryId: id ?? undefined }))}
      />

      <CategoryRow
        title="Filter Barang Ritel"
        loading={categoriesLoading}
        categories={categories.filter((c) => c.group === 'RETAIL')}
        selectedId={filter.categoryId ?? null}
        onSelect={(id) => setFilter((f) => ({ ...f, categoryId: id ?? undefined }))}
      />

      <section>
        <div className="kc-section-head">
          <h2 className="kc-section-head__title">Pilih Tempat Belanja</h2>
          {/* Lokasi duduk di kepala section, sama seperti di aplikasi:
              ia keterangan dari pilihan di bawahnya, bukan baris tersendiri. */}
          <button
            type="button"
            className="kc-locationbtn"
            onClick={() => selectSource('NEAREST')}
            disabled={locating}
          >
            <MapPin size={14} aria-hidden="true" />
            <span className="kc-locationbtn__name">
              {locating
                ? 'Mencari lokasi…'
                : filter.latitude != null
                  ? 'Lokasi Anda'
                  : 'Pilih lokasi'}
            </span>
            <span className="kc-locationbtn__action">Ubah</span>
          </button>
        </div>
        <SourceSelector active={source} onSelect={selectSource} />
        <p className="kc-hint">
          {locating
            ? 'Mencari lokasi Anda…'
            : locationDenied
              ? 'Lokasi belum diizinkan, jadi urutan terdekat belum bisa dipakai. ' +
                'Izinkan lokasi di peramban, lalu coba lagi.'
              : 'Pilih sumber produk: dari Kopdes (Koperasi Desa) atau Mitra UMKM lokal.'}
        </p>
      </section>

      <section>
        <div className="kc-section-head">
          <h2 className="kc-section-head__title">Rekomendasi Untukmu</h2>
          <button
            type="button"
            className="kc-section-head__action"
            onClick={resetFilter}
          >
            Lihat Semua
          </button>
        </div>

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
            body="Coba ubah kata pencarian atau filter yang digunakan."
            actionLabel="Atur Ulang Filter"
            onAction={resetFilter}
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
              <div className="kc-more">
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
      </section>

      {sheetOpen && (
        <MarketplaceFilterSheet
          filter={filter}
          onClose={() => setSheetOpen(false)}
          onApply={(next) => {
            // Pencarian dipegang kolomnya sendiri, jadi modal tidak boleh
            // menghapusnya saat menerapkan filter.
            setFilter((f) => ({ ...next, search: f.search }));
            setSheetOpen(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Iklan utama dari `GET /banners`, dengan isi bawaan sebagai cadangan.
 *
 * Isinya tidak permanen di dalam widget: begitu admin memasang banner, banner
 * itulah yang tampil. Gagal memuatnya tidak menghentikan katalog.
 */
function PromoBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    publicApi
      .getBanners()
      .then((list) => {
        if (!cancelled && list?.length) setBanners(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Satu iklan bawaan sebagai cadangan; begitu admin memasang banner, banner
  // itulah yang tampil.
  const items: Banner[] = banners.length
    ? banners
    : [
        {
          id: 'default',
          badge: 'PROMO HARI INI',
          title: 'Belanja Hemat di',
          highlight: 'KMP Mitra',
          description: 'Produk Kopdes dan UMKM pilihan untuk kebutuhan keluarga',
          ctaLabel: 'Belanja Sekarang',
          ctaRoute: '/marketplace',
        },
      ];

  /**
   * Indikator halaman dihitung dari posisi gulir, bukan dari timer.
   *
   * Tidak ada auto-scroll seperti di aplikasi: di web, banner yang bergerak
   * sendiri memindahkan target sentuh tepat saat orang hendak menekannya, dan
   * satu-satunya banner di database hari ini membuat animasinya tanpa guna.
   */
  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const next = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (next !== active) setActive(next);
  }

  return (
    <div>
      <div className="kc-promorail" onScroll={onScroll} ref={rail}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.ctaRoute || '/marketplace'}
            className="kc-promobanner"
          >
            <span className="kc-promobanner__text">
              {item.badge && (
                <span className="kc-promobanner__badge">{item.badge}</span>
              )}
              <span className="kc-promobanner__title">
                {item.title} {item.highlight && <em>{item.highlight}</em>}
              </span>
              {item.description && (
                <span className="kc-promobanner__body">{item.description}</span>
              )}
              <span className="kc-promobanner__cta">
                {item.ctaLabel || 'Belanja Sekarang'}
                <ArrowLeft
                  size={15}
                  aria-hidden="true"
                  style={{ transform: 'rotate(180deg)' }}
                />
              </span>
            </span>
            <span className="kc-promobanner__art" aria-hidden="true">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" />
              ) : (
                <ShoppingBasket size={30} />
              )}
            </span>
          </Link>
        ))}
      </div>

      {/* Indikator hanya berarti bila ada lebih dari satu iklan. Titiknya
          tombol sungguhan, bukan hiasan — pada penunjuk kasar, menggeser
          bukan satu-satunya cara berpindah. */}
      {items.length > 1 && (
        <div className="kc-dots">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className="kc-dots__dot"
              aria-label={`Iklan ${i + 1} dari ${items.length}`}
              aria-current={i === active}
              onClick={() => {
                const el = rail.current;
                if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SourceSelector({
  active,
  onSelect,
}: {
  active: SourceTab;
  onSelect: (next: SourceTab) => void;
}) {
  return (
    <div className="kc-segmented" role="tablist" aria-label="Sumber produk">
      {SOURCES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onSelect(id)}
        >
          {/* Ikon mendampingi teks, tidak menggantikannya. */}
          <Icon size={14} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Deret kartu filter kategori — padanan `CategoryFilterRow` di mobile.
 *
 * Menekan kartu yang sedang aktif melepas filternya, jadi tidak perlu tombol
 * "Semua Kategori" terpisah; itu juga perilaku `onSelected(null)` di Dart.
 */
function CategoryRow({
  title,
  categories,
  loading,
  selectedId,
  onSelect,
}: {
  title: string;
  categories: Category[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  /**
   * Selama kategori dimuat, tempatnya tetap dipesan.
   *
   * Sebelumnya section ini mengembalikan null lalu muncul begitu datanya tiba,
   * mendorong seluruh halaman ~333px ke bawah — satu-satunya penyumbang CLS
   * 0,197 di halaman ini, hampir dua kali anggaran 0,1.
   */
  if (loading) {
    return (
      <section>
        <div className="kc-section-head">
          <h2 className="kc-section-head__title">{title}</h2>
        </div>
        <div className="kc-rail" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="kc-filtercard kc-filtercard--skeleton" />
          ))}
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section>
      <div className="kc-section-head">
        <h2 className="kc-section-head__title">{title}</h2>
      </div>
      <div className="kc-rail">
        <button
          type="button"
          className="kc-filtercard"
          aria-pressed={selectedId === null}
          onClick={() => onSelect(null)}
          style={{ ['--tile-tint' as string]: 'var(--primary)' }}
        >
          <span className="kc-filtercard__icon" aria-hidden="true">
            <LayoutGrid size={22} strokeWidth={2.1} />
          </span>
          <span className="kc-filtercard__label">Semua</span>
        </button>

        {categories.map((cat, i) => {
          const active = selectedId === cat.id;
          const Icon = categoryIcon(cat.name);
          return (
            <button
              key={cat.id}
              type="button"
              className="kc-filtercard"
              aria-pressed={active}
              onClick={() => onSelect(active ? null : cat.id)}
              style={{ ['--tile-tint' as string]: tintAt(i) }}
            >
              <span className="kc-filtercard__icon" aria-hidden="true">
                <Icon size={22} strokeWidth={2.1} />
              </span>
              <span className="kc-filtercard__label">{cat.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

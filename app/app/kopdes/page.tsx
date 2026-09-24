'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { publicApi } from '@/lib/api';
import { KopdesCard } from '@/components/KopdesCard';
import { Button, Chip, Message, Skeleton } from '@shared/design/ui';
import { LocateFixed, Search } from '@shared/design/icons';
import type { Koperasi } from '@shared/api';

/**
 * Halaman "Lihat Lainnya" — padanan `KoperasiListScreen`.
 *
 * Pencarian, radius, dan "Buka Sekarang" semuanya dikirim ke server: menyaring
 * satu halaman di browser memberi hasil salah begitu daftarnya lebih panjang
 * daripada satu halaman. Radius dan status buka hanya ada pada endpoint
 * terdekat, jadi chip-nya baru muncul setelah lokasi diizinkan.
 *
 * Chip "Rating 4+" milik versi mobile sengaja tidak ditiru: backend tidak
 * punya filter rating, dan versi mobile menyaringnya per halaman — persis
 * kesalahan yang dilarang di atas.
 */

const LIMIT = 10;
const RADII = [5, 10, 25];

interface Origin {
  latitude: number;
  longitude: number;
}

export default function KopdesListPage() {
  const [items, setItems] = useState<Koperasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [openNow, setOpenNow] = useState(false);
  const [locating, setLocating] = useState(false);
  // Dinaikkan oleh "Coba Lagi": menyetel ulang filter ke nilai yang sama
  // tidak menjalankan efeknya lagi.
  const [attempt, setAttempt] = useState(0);

  // Pencarian di-debounce supaya tidak satu permintaan per ketikan.
  const [query, setQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  const fetchPage = useCallback(
    async (next: number) => {
      return origin
        ? publicApi.getNearbyKoperasi(
            { ...origin, radiusKm, search, openNow },
            next,
            LIMIT,
          )
        : publicApi.getKoperasiList(search, next, LIMIT);
    },
    [origin, radiusKm, search, openNow],
  );

  // Muat ulang dari halaman satu setiap filter berubah.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void fetchPage(1)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setPage(res.meta.page);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetchPage, attempt]);

  // Penjaga muat-lebih-banyak: tanpa ini, klik beruntun meminta halaman yang
  // sama dua kali dan barisnya tampil ganda.
  const busy = useRef(false);
  async function loadMore() {
    if (busy.current || page >= totalPages) return;
    busy.current = true;
    setMore(true);
    try {
      const res = await fetchPage(page + 1);
      setItems((prev) => [...prev, ...res.items]);
      setPage(res.meta.page);
      setTotalPages(res.meta.totalPages);
    } catch {
      // Diamkan: daftar yang sudah tampil tetap utuh.
    } finally {
      busy.current = false;
      setMore(false);
    }
  }

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setOrigin({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => setLocating(false),
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  return (
    <div className="stack-lg">
      <div>
        <h1 className="page-title">Kopdes</h1>
        <p className="page-sub">
          {origin
            ? `Diurutkan dari yang terdekat, dalam radius ${radiusKm} km.`
            : 'Seluruh koperasi desa yang terdaftar.'}
        </p>
      </div>

      <label className="kc-hero__field">
        <Search size={18} aria-hidden="true" />
        <span className="visually-hidden">Cari Kopdes atau desa</span>
        <input
          type="search"
          name="q"
          // Kolom pencarian bukan kolom data pribadi: pelengkapan otomatis
          // dan pemeriksaan ejaan hanya mengganggu.
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari Kopdes atau desa…"
        />
      </label>

      <div className="kc-pills">
        {origin ? (
          <>
            {RADII.map((km) => (
              <Chip
                key={km}
                selected={radiusKm === km}
                onClick={() => setRadiusKm(km)}
              >
                {km} km
              </Chip>
            ))}
            <Chip selected={openNow} onClick={() => setOpenNow(!openNow)}>
              Buka Sekarang
            </Chip>
          </>
        ) : (
          <button
            type="button"
            className="kc-locate"
            onClick={locate}
            disabled={locating}
          >
            <LocateFixed size={15} aria-hidden="true" />
            {locating ? 'Mencari lokasi…' : 'Urutkan dari yang terdekat'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="stack-md">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={210} radius={16} />
          ))}
        </div>
      ) : failed ? (
        <Message
          title="Data belum berhasil dimuat"
          body="Periksa koneksi, lalu coba lagi."
          actionLabel="Coba Lagi"
          onAction={() => setAttempt((n) => n + 1)}
        />
      ) : items.length === 0 ? (
        <Message
          title="Belum ada Kopdes yang cocok"
          body={
            origin
              ? 'Perluas jarak pencarian atau ubah kata kunci.'
              : 'Ubah kata kunci pencarian.'
          }
        />
      ) : (
        <>
          <div className="stack-md">
            {items.map((k) => (
              <KopdesCard key={k.id} koperasi={k} wide />
            ))}
          </div>

          {page < totalPages && (
            <Button variant="secondary" block onClick={loadMore} disabled={more}>
              {more ? 'Memuat…' : 'Muat Lebih Banyak'}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

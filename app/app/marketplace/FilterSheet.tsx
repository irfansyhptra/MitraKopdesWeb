'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Chip } from '@shared/design/ui';
import type { MarketplaceFilter, MarketplaceSort } from '@shared/api';

/**
 * Modal filter lanjutan — padanan `showMarketplaceFilterSheet` di aplikasi.
 *
 * Perubahan hanya diterapkan saat "Terapkan Filter" ditekan, sehingga memilih
 * rentang harga tidak memicu satu permintaan jaringan per ketukan.
 *
 * Hanya menawarkan yang benar-benar dikerjakan server: harga, sumber,
 * urutan, rating minimum, diskon, dan ketersediaan stok. Urutan menurut
 * rating tidak ada di backend, jadi tombolnya juga tidak ada di sini.
 */

const PRICES: [string, number | undefined, number | undefined][] = [
  ['Semua harga', undefined, undefined],
  ['< Rp25.000', undefined, 25000],
  ['Rp25.000 – Rp75.000', 25000, 75000],
  ['> Rp75.000', 75000, undefined],
];

const RATINGS: [string, number][] = [
  ['Semua', 0],
  ['4,0+', 4],
  ['4,5+', 4.5],
];

const SORTS: [string, MarketplaceSort][] = [
  ['Terbaru', 'newest'],
  ['Harga termurah', 'price_asc'],
  ['Harga tertinggi', 'price_desc'],
];

export function MarketplaceFilterSheet({
  filter,
  onApply,
  onClose,
}: {
  filter: MarketplaceFilter;
  onApply: (next: MarketplaceFilter) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<MarketplaceFilter>(filter);
  const panel = useRef<HTMLDivElement>(null);

  // Esc menutup, dan fokus pindah ke panel supaya pembaca layar tidak
  // tertinggal di halaman di belakangnya.
  useEffect(() => {
    panel.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const priceSelected = (min?: number, max?: number) =>
    (draft.minPrice ?? undefined) === min && (draft.maxPrice ?? undefined) === max;

  return (
    <div
      className="kc-sheet__scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="kc-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Filter produk"
        tabIndex={-1}
        ref={panel}
      >
        <div className="kc-sheet__grab" aria-hidden="true" />
        <h2 className="kc-sheet__title">Filter Produk</h2>

        <p className="kc-sheet__label">Rentang Harga</p>
        <div className="kc-pills">
          {PRICES.map(([label, min, max]) => (
            <Chip
              key={label}
              selected={priceSelected(min, max)}
              onClick={() => setDraft((d) => ({ ...d, minPrice: min, maxPrice: max }))}
            >
              {label}
            </Chip>
          ))}
        </div>

        <p className="kc-sheet__label">Sumber Produk</p>
        <div className="kc-pills">
          {(
            [
              ['Semua', 'ALL'],
              ['Kopdes', 'KOPDES'],
              ['Mitra UMKM', 'UMKM'],
            ] as const
          ).map(([label, id]) => (
            <Chip
              key={id}
              selected={(draft.sellerType ?? 'ALL') === id}
              onClick={() => setDraft((d) => ({ ...d, sellerType: id }))}
            >
              {label}
            </Chip>
          ))}
        </div>

        <p className="kc-sheet__label">Urutkan</p>
        <div className="kc-pills">
          {SORTS.map(([label, id]) => (
            <Chip
              key={id}
              selected={draft.sort === id}
              onClick={() => setDraft((d) => ({ ...d, sort: id }))}
            >
              {label}
            </Chip>
          ))}
        </div>

        <p className="kc-sheet__label">Rating Minimum</p>
        <div className="kc-pills">
          {RATINGS.map(([label, value]) => (
            <Chip
              key={label}
              selected={(draft.minRating ?? 0) === value}
              onClick={() => setDraft((d) => ({ ...d, minRating: value }))}
            >
              {label}
            </Chip>
          ))}
        </div>
        <p className="kc-hint">
          Produk yang belum punya ulasan ikut tersaring keluar saat rating
          minimum dipakai.
        </p>

        <label className="kc-sheet__switch">
          <input
            type="checkbox"
            checked={draft.discounted ?? false}
            onChange={(e) => setDraft((d) => ({ ...d, discounted: e.target.checked }))}
          />
          <span>
            Hanya produk diskon
            <small>
              Harga diskon hanya ada pada produk Kopdes, jadi produk mitra tidak
              ikut tampil.
            </small>
          </span>
        </label>

        <label className="kc-sheet__switch">
          <input
            type="checkbox"
            checked={draft.inStock ?? false}
            onChange={(e) => setDraft((d) => ({ ...d, inStock: e.target.checked }))}
          />
          <span>Hanya produk tersedia</span>
        </label>

        <div className="kc-sheet__acts">
          <Button
            variant="secondary"
            block
            onClick={() => setDraft({ sellerType: 'ALL', sort: 'newest' })}
          >
            Atur Ulang
          </Button>
          <Button block onClick={() => onApply(draft)}>
            Terapkan Filter
          </Button>
        </div>
      </div>
    </div>
  );
}

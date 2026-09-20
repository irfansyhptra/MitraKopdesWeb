'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useStaff } from '@/components/staff/StaffContext';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import { StaffAccess, StaffPageHeader } from '@/components/staff/StaffPage';
import { formatRupiah, toRupiah } from '@shared/format';
import { Permissions } from '@shared/api';
import type { StockItem } from '@shared/api';

/**
 * Manajemen Stok — padanan `StockManagementScreen` pada aplikasi Flutter.
 *
 * Filter `all|low|out` dikirim ke server bersama paginasinya. Menandai
 * "menipis" di peramban berarti menghitungnya hanya atas halaman yang sedang
 * terbuka, dan pegawai akan mengira sisanya aman.
 */

const FILTERS: { id: 'all' | 'low' | 'out'; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'low', label: 'Menipis' },
  { id: 'out', label: 'Habis' },
];

const PAGE_SIZE = 20;

export default function StaffStockPage() {
  return (
    <Suspense fallback={<StaffSkeleton height={180} />}>
      <StaffAccess permission={Permissions.inventoryRead}><StockManagement /></StaffAccess>
    </Suspense>
  );
}

function StockManagement() {
  const { can } = useStaff();
  const params = useSearchParams();
  const initial = (params?.get('filter') as 'all' | 'low' | 'out') ?? 'all';

  const [filter, setFilter] = useState<'all' | 'low' | 'out'>(
    FILTERS.some((f) => f.id === initial) ? initial : 'all',
  );
  const [items, setItems] = useState<StockItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<StockItem | null>(null);

  const load = useCallback(async (next: 'all' | 'low' | 'out') => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStockList(next, 1, PAGE_SIZE);
      setItems(res.items);
      setPage(res.meta.page);
      setTotalPages(res.meta.totalPages);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  async function loadMore() {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const res = await api.getStockList(filter, page + 1, PAGE_SIZE);
      setItems((prev) => [...prev, ...res.items]);
      setPage(res.meta.page);
      setTotalPages(res.meta.totalPages);
    } catch {
      // Baris yang sudah tampil tetap di layar.
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <>
      <StaffPageHeader title="Manajemen Stok" onRefresh={() => void load(filter)} />
      {can(Permissions.productCreate) && <div className="staff-actions" style={{ marginBottom: 'var(--sp-base)' }}><Link className="staff-btn" href="/pegawai/barang/baru">Input Barang</Link></div>}

      <div className="filterbar__row" role="tablist" aria-label="Filter stok">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            className="kc-chip"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 'var(--sp-base)' }}>
        {loading && (
          <div className="staff-surface staff-surface--flush">
            {[0, 1, 2, 3, 4].map((i) => (
              <div className="staff-order" key={i}>
                <div className="staff-order__body">
                  <StaffSkeleton height={13} width="50%" />
                  <div style={{ height: 6 }} />
                  <StaffSkeleton height={12} width="35%" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && <StaffError message={error} onRetry={() => void load(filter)} />}

        {!loading && !error && items.length === 0 && (
          <div className="staff-surface staff-empty">
            {filter === 'all'
              ? 'Belum ada produk terdaftar'
              : 'Tidak ada produk pada filter ini — kabar baik'}
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <div className="staff-surface staff-surface--flush">
              {items.map((item) => (
                <StockRow
                  key={item.id}
                  item={item}
                  onAdjust={() => setAdjusting(item)}
                />
              ))}
            </div>

            {page < totalPages && (
              <div style={{ textAlign: 'center', marginTop: 'var(--sp-base)' }}>
                <button
                  type="button"
                  className="staff-btn staff-btn--ghost"
                  style={{ width: 'auto' }}
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? 'Memuat…' : 'Muat produk lainnya'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {adjusting && (
        <AdjustDialog
          item={adjusting}
          onClose={() => setAdjusting(null)}
          onDone={() => {
            setAdjusting(null);
            void load(filter);
          }}
        />
      )}
    </>
  );
}

function StockRow({ item, onAdjust }: { item: StockItem; onAdjust: () => void }) {
  const { can } = useStaff();
  const allowed = can(Permissions.inventoryAdjust) || can(Permissions.inventoryOpname);

  // Keadaan stok ditulis, bukan hanya diberi warna: warna saja tidak terbaca
  // pegawai yang buta warna, dan ini satu-satunya penanda barang habis.
  const state =
    item.stock <= 0
      ? { label: 'Habis', color: 'var(--st-primary)' }
      : item.stock <= item.minStock
        ? { label: 'Menipis', color: 'var(--st-warning)' }
        : { label: 'Aman', color: 'var(--st-success)' };

  return (
    <div className="staff-order">
      <div className="staff-order__body">
        <p className="staff-order__customer" style={{ fontWeight: 600 }}>
          {item.name}
        </p>
        <p className="staff-order__meta">
          <span className="staff-order__total">
            {item.stock} {item.unit || 'pcs'}
          </span>
          <span
            className="staff-chip"
            style={{
              ['--chip-fg' as string]: state.color,
              ['--chip-bg' as string]: `color-mix(in srgb, ${state.color} 12%, #fff)`,
            }}
          >
            {state.label}
          </span>
          <span>min. {item.minStock}</span>
          <span>{formatRupiah(toRupiah(item.price))}</span>
          {item.sku && <span>SKU {item.sku}</span>}
        </p>
      </div>

      <div className="staff-order__action staff-actions">
        {can(Permissions.productUpdate) && <Link className="staff-btn staff-btn--ghost" href={`/pegawai/barang/${encodeURIComponent(item.id)}`}>Ubah Produk</Link>}
        <button
          type="button"
          className="staff-btn staff-btn--ghost"
          style={{ width: 'auto' }}
          disabled={!allowed}
          title={allowed ? undefined : 'Penyesuaian stok tidak termasuk wewenang Anda'}
          onClick={onAdjust}
        >
          Sesuaikan
        </button>
      </div>
    </div>
  );
}

/**
 * Penyesuaian stok. Alasan wajib diisi pada barang masuk/keluar — mutasi
 * tanpa alasan membuat selisih stok mustahil ditelusuri sebulan kemudian.
 */
function AdjustDialog({
  item,
  onClose,
  onDone,
}: {
  item: StockItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const { can } = useStaff();
  const [mode, setMode] = useState<'IN' | 'OUT' | 'OPNAME'>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAdjust = can(Permissions.inventoryAdjust);
  const canOpname = can(Permissions.inventoryOpname);
  const amount = Number.parseInt(quantity, 10);
  const valid =
    Number.isFinite(amount) &&
    (mode === 'OPNAME' ? amount >= 0 : amount >= 1 && reason.trim().length > 0);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'OPNAME') {
        await api.stockOpname({
          productId: item.id,
          countedStock: amount,
          reason: reason.trim() || undefined,
        });
      } else {
        await api.adjustStock({
          productId: item.id,
          type: mode,
          quantity: amount,
          reason: reason.trim(),
        });
      }
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Sesuaikan stok ${item.name}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.35)',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--sp-base)',
      }}
    >
      <div
        className="staff-surface stack-md"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(460px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--st-ink)' }}>
            {item.name}
          </p>
          <p style={{ fontSize: 12, color: 'var(--st-muted)' }}>
            Stok tercatat {item.stock} {item.unit || 'pcs'}
          </p>
        </div>

        <div className="filterbar__row" role="tablist" aria-label="Jenis penyesuaian">
          {([
            { id: 'IN', label: 'Barang Masuk', allowed: canAdjust },
            { id: 'OUT', label: 'Barang Keluar', allowed: canAdjust },
            { id: 'OPNAME', label: 'Opname', allowed: canOpname },
          ] as const).map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              className="kc-chip"
              aria-selected={mode === m.id}
              disabled={!m.allowed}
              title={m.allowed ? undefined : 'Tidak termasuk wewenang Anda'}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="adjust-qty">
            {mode === 'OPNAME' ? 'Hasil hitung fisik' : 'Jumlah'}
          </label>
          <input
            id="adjust-qty"
            type="number"
            inputMode="numeric"
            min={mode === 'OPNAME' ? 0 : 1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="adjust-reason">
            Alasan {mode === 'OPNAME' ? '(opsional)' : '(wajib)'}
          </label>
          <input
            id="adjust-reason"
            type="text"
            value={reason}
            placeholder="mis. kiriman supplier, barang rusak, hasil opname"
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
          <button type="button" className="staff-btn staff-btn--ghost" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="staff-btn"
            disabled={!valid || busy}
            onClick={() => void submit()}
          >
            {busy ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}

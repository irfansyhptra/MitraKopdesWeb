'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useStaff } from '@/components/staff/StaffContext';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import { StaffAccess, StaffPageHeader } from '@/components/staff/StaffPage';
import { formatRupiah, orderNumber, toRupiah } from '@shared/format';
import { Permissions } from '@shared/api';
import type { Order } from '@shared/api';
import { Package } from '@shared/design/icons';

/**
 * Pesanan Masuk — padanan `OrderManagementScreen` pada aplikasi Flutter.
 *
 * Filter status dikirim ke server dan daftarnya berhalaman. Menyaring satu
 * halaman di peramban memberi hasil salah begitu pesanan lebih panjang
 * daripada satu halaman, dan tetap mengunduh baris yang akhirnya dibuang.
 */

const TABS: { id: string | undefined; label: string }[] = [
  { id: undefined, label: 'Semua' },
  { id: 'PAID', label: 'Baru' },
  { id: 'PROCESSING', label: 'Diproses' },
  { id: 'READY_FOR_DELIVERY', label: 'Siap Dikirim' },
  { id: 'OUT_FOR_DELIVERY', label: 'Dikirim' },
  { id: 'COMPLETED', label: 'Selesai' },
];

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Menunggu Pembayaran',
  PAID: 'Baru',
  PROCESSING: 'Diproses',
  READY_FOR_DELIVERY: 'Siap Dikirim',
  OUT_FOR_DELIVERY: 'Dalam Pengiriman',
  DELIVERED: 'Diterima',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

/**
 * Lompatan status yang ditawarkan — kembar dari `ALLOWED_ORDER_TRANSITIONS`
 * di backend. Daftar ini hanya menentukan tombol apa yang digambar;
 * penolakan lompatan tetap dikerjakan server.
 */
const NEXT_STATUSES: Record<string, { status: string; label: string }[]> = {
  PENDING: [
    { status: 'PROCESSING', label: 'Proses' },
    { status: 'CANCELLED', label: 'Batalkan' },
  ],
  PAID: [
    { status: 'PROCESSING', label: 'Proses' },
    { status: 'CANCELLED', label: 'Batalkan' },
  ],
  PROCESSING: [
    { status: 'READY_FOR_DELIVERY', label: 'Siapkan Barang' },
    { status: 'CANCELLED', label: 'Batalkan' },
  ],
  READY_FOR_DELIVERY: [{ status: 'OUT_FOR_DELIVERY', label: 'Kirim' }],
  OUT_FOR_DELIVERY: [{ status: 'DELIVERED', label: 'Tandai Diterima' }],
  DELIVERED: [{ status: 'COMPLETED', label: 'Selesaikan' }],
  COMPLETED: [],
  CANCELLED: [],
};

const PAGE_SIZE = 20;

export default function StaffOrdersPage() {
  return (
    <Suspense fallback={<StaffSkeleton height={180} />}>
      <StaffAccess permission={Permissions.orderRead}><OrderManagement /></StaffAccess>
    </Suspense>
  );
}

function OrderManagement() {
  const params = useSearchParams();
  const [status, setStatus] = useState<string | undefined>(
    params?.get('status') ?? undefined,
  );
  const [items, setItems] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextStatus: string | undefined) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminOrders(nextStatus, 1, PAGE_SIZE);
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
    void load(status);
  }, [load, status]);

  async function loadMore() {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const res = await api.getAdminOrders(status, page + 1, PAGE_SIZE);
      setItems((prev) => [...prev, ...res.items]);
      setPage(res.meta.page);
      setTotalPages(res.meta.totalPages);
    } catch {
      // Pesanan yang sudah tampil tetap di layar; tombolnya bisa ditekan lagi.
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <>
      <StaffPageHeader title="Pesanan Masuk" onRefresh={() => void load(status)} />

      <div className="filterbar__row" role="tablist" aria-label="Filter status">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            className="kc-chip"
            aria-selected={status === tab.id}
            onClick={() => setStatus(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 'var(--sp-base)' }}>
        {loading && (
          <div className="staff-surface staff-surface--flush">
            {[0, 1, 2, 3].map((i) => (
              <div className="staff-order" key={i}>
                <StaffSkeleton height={44} width={44} radius={12} />
                <div className="staff-order__body">
                  <StaffSkeleton height={13} width="45%" />
                  <div style={{ height: 6 }} />
                  <StaffSkeleton height={12} width="70%" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <StaffError message={error} onRetry={() => void load(status)} />
        )}

        {!loading && !error && items.length === 0 && (
          <div className="staff-surface staff-empty">
            Tidak ada pesanan pada filter ini
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <div className="staff-surface staff-surface--flush">
              {items.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onMoved={(next) =>
                    setItems((prev) =>
                      prev.map((o) =>
                        o.id === order.id ? { ...o, status: next as Order['status'] } : o,
                      ),
                    )
                  }
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
                  {loadingMore ? 'Memuat…' : 'Muat pesanan lainnya'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function OrderRow({
  order,
  onMoved,
}: {
  order: Order;
  onMoved: (next: string) => void;
}) {
  const { can } = useStaff();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const transitions = NEXT_STATUSES[order.status] ?? [];
  const canProcess = can(Permissions.orderProcess);
  const canCancel = can(Permissions.orderCancel);

  async function move(next: string) {
    setBusy(next);
    setFailed(null);
    try {
      await api.updateAdminOrderStatus(order.id, next);
      onMoved(next);
    } catch (e) {
      // Status di layar tidak diubah sebelum server menerimanya: baris yang
      // terlihat "Diproses" padahal ditolak membuat pegawai mengira
      // pekerjaannya sudah selesai.
      setFailed((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="staff-order">
      <span className="staff-order__thumb">
        <Package size={20} aria-hidden="true" />
      </span>

      <div className="staff-order__body">
        <p className="staff-order__ref">
          <span>{orderNumber(order)}</span>
        </p>
        <p className="staff-order__customer">
          {order.customer?.name ?? 'Pelanggan'}
        </p>
        <p className="staff-order__meta">
          <span className="staff-order__total">
            {formatRupiah(toRupiah(order.totalAmount))}
          </span>
          <span className="staff-chip">
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
          <Link href={`/orders/${order.id}`} className="staff-section__action">
            Detail
          </Link>
        </p>
        {failed && (
          <p className="form-error" style={{ marginTop: 4 }}>
            {failed}
          </p>
        )}
      </div>

      {transitions.length > 0 && (
        <div
          className="staff-order__action"
          style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}
        >
          {transitions.map((t) => {
            // Pembatalan adalah wewenang tersendiri: pegawai boleh memproses
            // pesanan tanpa boleh membatalkannya.
            const allowed = t.status === 'CANCELLED' ? canCancel : canProcess;
            return (
              <button
                key={t.status}
                type="button"
                className={
                  t.status === 'CANCELLED'
                    ? 'staff-btn staff-btn--ghost'
                    : 'staff-btn'
                }
                style={{ width: 'auto' }}
                disabled={!!busy || !allowed}
                title={allowed ? undefined : 'Tindakan ini tidak termasuk wewenang Anda'}
                onClick={() => void move(t.status)}
              >
                {busy === t.status ? 'Memproses…' : t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

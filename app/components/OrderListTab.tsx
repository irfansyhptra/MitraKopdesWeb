'use client';

import Link from 'next/link';
import { Badge, Chip, ListGroup, Message, Skeleton } from '@shared/design/ui';
import { Package } from '@shared/design/icons';
import {
  formatDate,
  formatRupiah,
  orderNumber,
  statusView,
  toRupiah,
} from '@shared/format';
import type { Order } from '@shared/api';

/**
 * Subpage Diproses & Selesai — padanan `OrderStatusCard` pada aplikasi
 * Flutter. Dikelompokkan per pesanan, bukan per penjual seperti keranjang.
 */

export type DoneFilter = 'all' | 'completed' | 'cancelled';

const DONE_FILTERS: { id: DoneFilter; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'completed', label: 'Selesai' },
  { id: 'cancelled', label: 'Dibatalkan' },
];

export function splitOrders(orders: Order[]) {
  const active: Order[] = [];
  const done: Order[] = [];
  for (const order of orders) {
    (statusView(order.status).active ? active : done).push(order);
  }
  return { active, done };
}

export function applyDoneFilter(orders: Order[], filter: DoneFilter): Order[] {
  if (filter === 'all') return orders;
  const wantCancelled = filter === 'cancelled';
  return orders.filter(
    (o) => statusView(o.status).cancelled === wantCancelled,
  );
}

export function OrderListTab({
  orders,
  loading,
  error,
  finished,
  filter,
  onFilter,
  hasMore,
  loadingMore,
  onLoadMore,
  onRetry,
}: {
  orders: Order[];
  loading: boolean;
  error: string | null;
  finished: boolean;
  filter?: DoneFilter;
  onFilter?: (next: DoneFilter) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="stack-md">
        {[0, 1].map((i) => (
          <div className="kc-card kc-card--pad stack-sm" key={i}>
            <Skeleton height={14} width="40%" />
            <Skeleton height={44} width="55%" />
            <Skeleton height={14} width="30%" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Message
        title="Pesanan belum berhasil dimuat"
        body={error}
        actionLabel="Coba Lagi"
        onAction={onRetry}
      />
    );
  }

  return (
    <div className="stack-md">
      {finished && filter && onFilter && (
        <div className="filterbar__row" aria-label="Filter riwayat">
          {DONE_FILTERS.map((option) => (
            <Chip
              key={option.id}
              selected={filter === option.id}
              onClick={() => onFilter(option.id)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      )}

      {orders.length === 0 ? (
        <Message
          title={
            finished
              ? 'Belum ada riwayat pesanan selesai'
              : 'Belum ada pesanan yang diproses'
          }
        />
      ) : (
        <ListGroup>
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} finished={finished} />
          ))}
        </ListGroup>
      )}

      {/* Riwayat berhalaman: tombol, bukan gulir otomatis. Tab ini dibuka
          untuk mencari satu pesanan, dan menarik halaman demi halaman sendiri
          menghabiskan kuota untuk baris yang tidak dicari. */}
      {hasMore && (
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="kc-btn kc-btn--secondary"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Memuat…' : 'Muat pesanan sebelumnya'}
          </button>
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  finished,
}: {
  order: Order;
  finished: boolean;
}) {
  const view = statusView(order.status);
  const items = order.items ?? [];
  const thumbs = items.slice(0, 3);
  const extra = items.length - thumbs.length;

  return (
    <article className="ordercard">
      <div className="ordercard__head">
        <span className="ordercard__ref">{orderNumber(order)}</span>
        <Badge variant={badgeVariant(view.badgeClass)}>{view.label}</Badge>
        <span className="t-caption-sm" style={{ marginLeft: 'auto' }}>
          {formatDate(order.createdAt)}
        </span>
      </div>

      <div className="ordercard__thumbs">
        {thumbs.map((item) => {
          const source = item.product ?? item.umkmProduct;
          const images = source?.images ?? [];
          const url = (images.find((i) => i.isPrimary) ?? images[0])?.url;
          return (
            <div key={item.id}>
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={source?.name ?? 'Produk'} loading="lazy" />
              ) : (
                <Package size={24} aria-hidden="true" style={{ color: 'var(--muted-soft)' }} />
              )}
            </div>
          );
        })}
        {extra > 0 && <div>+{extra}</div>}
        <span className="t-caption-sm" style={{ marginLeft: 'auto' }}>
          {items.length} produk · {order.paymentMethod}
        </span>
      </div>

      <div className="ordercard__actions">
        <span
          style={{
            marginRight: 'auto',
            fontSize: 15,
            fontWeight: 800,
            color: 'var(--primary)',
          }}
        >
          {formatRupiah(toRupiah(order.totalAmount))}
        </span>

        <Link href={`/orders/${order.id}`} className="kc-btn kc-btn--secondary">
          {view.stage === 'shipping' ? 'Lacak Pesanan' : 'Lihat Detail'}
        </Link>

        {/* Tombol bayar hanya saat pembayaran memang masih menunggu. */}
        {!finished && order.status === 'PENDING' && (
          <Link href={`/orders/${order.id}`} className="kc-btn kc-btn--primary">
            Bayar Sekarang
          </Link>
        )}

        {/* "Beri Ulasan" tidak dipasang di sini: syaratnya diketahui server
            (pesanan milik pengguna, sudah diterima, produk belum diulas),
            jadi tombolnya dibangun di halaman detail yang memang memanggil
            `/reviews/reviewable/:orderId`. */}
        {finished && !view.cancelled && (
          <Link href={`/orders/${order.id}`} className="kc-btn kc-btn--ghost">
            Beri Ulasan
          </Link>
        )}
      </div>
    </article>
  );
}

function badgeVariant(
  badgeClass: string,
): 'primary' | 'success' | 'warning' | 'muted' {
  if (badgeClass.includes('success')) return 'success';
  if (badgeClass.includes('warning')) return 'warning';
  if (badgeClass.includes('primary')) return 'primary';
  return 'muted';
}

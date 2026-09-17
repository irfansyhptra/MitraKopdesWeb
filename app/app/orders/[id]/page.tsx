'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import {
  Badge,
  Button,
  Card,
  Message,
  MoneyLine,
  SectionHeader,
  Skeleton,
} from '@shared/design/ui';
import {
  formatDate,
  formatRupiah,
  formatTime,
  orderNumber,
  shippingLabel,
  statusView,
  toRupiah,
} from '@shared/format';
import { ReviewDialog } from '@/components/ReviewDialog';
import type { Order, ReviewableItem, TimelineEntry } from '@shared/api';

/**
 * Detail pesanan — padanan `OrderDetailScreen` + `OrderTimeline` pada
 * aplikasi Flutter.
 */

/** Tahap yang ditampilkan timeline, urut sesuai alur kerja koperasi. */
const STAGES: { status: string; label: string }[] = [
  { status: 'PENDING', label: 'Menunggu Pembayaran' },
  { status: 'PAID', label: 'Pembayaran Berhasil' },
  { status: 'PROCESSING', label: 'Diproses' },
  { status: 'READY_FOR_DELIVERY', label: 'Siap Dikirim' },
  { status: 'OUT_FOR_DELIVERY', label: 'Dalam Pengiriman' },
  { status: 'DELIVERED', label: 'Terkirim' },
  { status: 'COMPLETED', label: 'Selesai' },
];

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? '';

  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [reviewable, setReviewable] = useState<ReviewableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOrder(orderId);
      setOrder(data);

      // Timeline dan daftar produk yang boleh diulas bersifat tambahan:
      // kegagalannya tidak boleh menutup detail pesanan.
      void api
        .getOrderTimeline(orderId)
        .then(setTimeline)
        .catch(() => undefined);

      if (statusView(data.status).stage === 'done' || data.status === 'DELIVERED') {
        void api
          .getReviewableItems(orderId)
          .then(setReviewable)
          .catch(() => undefined);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?next=/orders/${orderId}`);
      return;
    }
    void load();
  }, [load, orderId, router]);

  async function confirmReceipt() {
    setConfirming(true);
    try {
      const updated = await api.confirmReceipt(orderId);
      setOrder(updated);
      const items = await api.getReviewableItems(orderId).catch(() => []);
      setReviewable(items);
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="stack-md">
        <Skeleton height={28} width="45%" />
        <Card className="stack-sm">
          <Skeleton height={16} width="30%" />
          <Skeleton height={120} />
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <Message
        title="Pesanan belum berhasil dimuat"
        body={error ?? undefined}
        actionLabel="Coba Lagi"
        onAction={() => void load()}
      />
    );
  }

  const view = statusView(order.status);
  const items = order.items ?? [];
  const subtotal = toRupiah(order.subtotal);
  const shippingFee = toRupiah(order.shippingFee);
  const discountAmount = toRupiah(order.discountAmount);
  // Pesanan lama (sebelum kolom komponen ada) memakai subtotal nol; di situ
  // rinciannya disembunyikan alih-alih menampilkan "Subtotal Rp0".
  const hasBreakdown = subtotal > 0;

  const currentIndex = STAGES.findIndex((s) => s.status === order.status);

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">{orderNumber(order)}</h1>
          <p className="page-sub">
            Dibuat {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
          </p>
        </div>
        <Badge variant={badgeVariant(view.badgeClass)}>{view.label}</Badge>
      </div>

      <div className="kc-split">
        <div className="stack-md">
          <Card className="stack-md">
            <SectionHeader title="Status Pesanan" />
            {view.cancelled ? (
              <p className="t-body-md">
                Pesanan ini dibatalkan. Stok barang sudah dikembalikan.
              </p>
            ) : (
              <ol className="stack-sm" style={{ listStyle: 'none' }}>
                {STAGES.map((stage, i) => {
                  const done = currentIndex >= 0 && i <= currentIndex;
                  return (
                    <li
                      key={stage.status}
                      style={{
                        display: 'flex',
                        gap: 'var(--sp-md)',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 18,
                          height: 18,
                          flex: 'none',
                          borderRadius: '50%',
                          background: done
                            ? 'var(--primary)'
                            : 'var(--surface-strong)',
                          border: `2px solid ${
                            done ? 'var(--primary)' : 'var(--hairline)'
                          }`,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: done ? 700 : 400,
                          color: done ? 'var(--ink)' : 'var(--muted)',
                        }}
                      >
                        {stage.label}
                      </span>
                      {/* Tahap yang sudah lewat ditandai teks juga, bukan
                          hanya warna bulatannya. */}
                      {done && (
                        <span className="visually-hidden">selesai</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}

            {view.stage === 'shipping' && (
              <Link
                href={`/tracking/${order.id}`}
                className="kc-btn kc-btn--secondary"
              >
                Lacak Pengiriman
              </Link>
            )}

            {order.status === 'DELIVERED' && (
              <Button disabled={confirming} onClick={() => void confirmReceipt()}>
                {confirming ? 'Menyimpan…' : 'Konfirmasi Pesanan Diterima'}
              </Button>
            )}
          </Card>

          <Card pad={false}>
            <div style={{ padding: 'var(--sp-base) var(--sp-base) 0' }}>
              <SectionHeader title={`Produk (${items.length})`} />
            </div>
            {items.map((item) => {
              const source = item.product ?? item.umkmProduct;
              const images = source?.images ?? [];
              const url = (images.find((i) => i.isPrimary) ?? images[0])?.url;
              return (
                <div className="cartrow" key={item.id}>
                  <div className="cartrow__thumb">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={source?.name ?? 'Produk'} />
                    ) : (
                      <span aria-hidden="true">📦</span>
                    )}
                  </div>
                  <div className="cartrow__body">
                    <p className="cartrow__name">{source?.name ?? 'Produk'}</p>
                    <p className="t-caption-sm">
                      {item.quantity} × {formatRupiah(toRupiah(item.price))}
                    </p>
                    <span className="cartrow__price">
                      {formatRupiah(toRupiah(item.price) * item.quantity)}
                    </span>
                  </div>
                </div>
              );
            })}
          </Card>

          {timeline.length > 0 && (
            <Card className="stack-sm">
              <SectionHeader title="Riwayat" />
              {timeline.map((entry, i) => (
                <div key={`${entry.action}-${i}`} className="kc-line">
                  <span className="kc-line__label">
                    {entry.details || entry.action}
                  </span>
                  <span className="t-caption-sm">
                    {formatDate(entry.createdAt)} {formatTime(entry.createdAt)}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>

        <aside className="kc-split__aside stack-md">
          <Card className="stack-md">
            <SectionHeader title="Rincian Pembayaran" />
            {hasBreakdown ? (
              <div className="stack-sm">
                <MoneyLine label="Subtotal Produk" value={formatRupiah(subtotal)} />
                <MoneyLine
                  label="Ongkos Kirim"
                  value={shippingLabel(shippingFee)}
                />
                {discountAmount > 0 && (
                  <MoneyLine
                    label="Diskon"
                    value={`-${formatRupiah(discountAmount)}`}
                    accent="success"
                  />
                )}
                <div
                  style={{
                    borderTop: '1px solid var(--hairline-soft)',
                    paddingTop: 'var(--sp-sm)',
                  }}
                >
                  <MoneyLine
                    label="Total Pembayaran"
                    value={formatRupiah(toRupiah(order.totalAmount))}
                    total
                  />
                </div>
              </div>
            ) : (
              <MoneyLine
                label="Total Pembayaran"
                value={formatRupiah(toRupiah(order.totalAmount))}
                total
              />
            )}

            <div className="kc-line">
              <span className="kc-line__label">Metode Pembayaran</span>
              <span className="kc-line__value">{order.paymentMethod}</span>
            </div>
            <div className="kc-line">
              <span className="kc-line__label">Status Pembayaran</span>
              <span className="kc-line__value">{order.paymentStatus}</span>
            </div>
          </Card>

          {/* Tombol ulasan hanya muncul kalau server memang menyisakan produk
              yang belum diulas. Tombol yang selalu tampil lalu dijawab 409
              "sudah pernah diulas" lebih buruk daripada tidak ada. */}
          {reviewable.length > 0 && (
            <Card className="stack-sm">
              <SectionHeader title="Beri Ulasan" />
              <p className="t-caption">
                {reviewable.length} produk pada pesanan ini belum kamu ulas.
              </p>
              <Button block onClick={() => setReviewOpen(true)}>
                Tulis Ulasan
              </Button>
            </Card>
          )}
        </aside>
      </div>

      {reviewOpen && (
        <ReviewDialog
          orderId={orderId}
          items={reviewable}
          onClose={() => setReviewOpen(false)}
          onDone={async () => {
            setReviewOpen(false);
            const items = await api
              .getReviewableItems(orderId)
              .catch(() => []);
            setReviewable(items);
          }}
        />
      )}
    </>
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

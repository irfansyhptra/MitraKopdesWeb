'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Badge, Card, Message, SectionHeader, Skeleton } from '@shared/design/ui';
import {
  formatDate,
  formatTime,
  orderNumber,
  statusView,
} from '@shared/format';
import type { Order, TimelineEntry } from '@shared/api';

/**
 * Lacak pengiriman — padanan `TrackingScreen`.
 *
 * Tidak menggambar pergerakan kurir bila koordinatnya belum ada: peta yang
 * bergerak tanpa data GPS adalah kebohongan yang paling mudah dipercaya
 * pemesan. Yang ditampilkan hanya status dan waktu yang benar-benar tercatat.
 */
export default function TrackingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? '';

  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOrder(orderId);
      setOrder(data);
      void api
        .getOrderTimeline(orderId)
        .then(setTimeline)
        .catch(() => undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?next=/tracking/${orderId}`);
      return;
    }
    void load();
  }, [load, orderId, router]);

  if (loading) {
    return (
      <div className="stack-md">
        <Skeleton height={28} width="45%" />
        <Card className="stack-sm">
          <Skeleton height={16} width="30%" />
          <Skeleton height={100} />
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <Message
        title="Pengiriman belum berhasil dimuat"
        body={error ?? undefined}
        actionLabel="Coba Lagi"
        onAction={() => void load()}
      />
    );
  }

  const view = statusView(order.status);

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Lacak Pesanan</h1>
          <p className="page-sub">{orderNumber(order)}</p>
        </div>
        <Badge variant="primary">{view.label}</Badge>
      </div>

      <div className="stack-md" style={{ maxWidth: 640 }}>
        <Card className="stack-sm">
          <SectionHeader title="Status Terakhir" />
          <p className="t-body-lg" style={{ fontWeight: 600 }}>
            {view.label}
          </p>
          <p className="t-caption">
            Diperbarui {formatDate(order.createdAt)}{' '}
            {formatTime(order.createdAt)}
          </p>
          {view.stage !== 'shipping' && (
            <p className="t-caption-sm">
              Posisi kurir baru tersedia setelah pesanan masuk pengiriman.
            </p>
          )}
        </Card>

        {timeline.length > 0 ? (
          <Card className="stack-sm">
            <SectionHeader title="Perjalanan Pesanan" />
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
        ) : (
          <Card>
            <Message
              title="Belum ada catatan perjalanan"
              body="Catatan muncul begitu Kopdes mulai memproses pesananmu."
            />
          </Card>
        )}

        <Link href={`/orders/${orderId}`} className="kc-btn kc-btn--secondary">
          Kembali ke Detail Pesanan
        </Link>
      </div>
    </>
  );
}

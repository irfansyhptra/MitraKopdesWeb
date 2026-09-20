'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, Message } from '@shared/design/ui';
import { formatRupiah } from '@shared/format';
import { RefreshCw } from '@shared/design/icons';
import {
  Countdown,
  PaymentSkeleton,
  PaymentStatusBadge,
  STATUS_VIEW,
} from '@/components/payment/PaymentBits';
import { QrisView } from '@/components/payment/QrisView';
import { VirtualAccountView } from '@/components/payment/VirtualAccountView';
import { EwalletView } from '@/components/payment/EwalletView';
import { methodInfo } from '@/components/payment/methods';
import {
  isFinalStatus,
  usePaymentStatus,
} from '@/components/payment/usePaymentStatus';

/**
 * Halaman instruksi pembayaran.
 *
 * Satu rute untuk semua metode; isinya yang berbeda. Memisahkannya per metode
 * berarti pengguna yang berganti metode berpindah URL, dan tautan yang
 * sempat ia simpan menjadi salah.
 *
 * Status **selalu** dari server. Kembali dari aplikasi e-wallet tidak
 * membuktikan pembayaran, dan menandainya lunas berdasarkan itu berarti
 * mengirim barang atas transaksi yang belum tentu terjadi.
 */
export default function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data, loading, checking, error, refresh } = usePaymentStatus(orderId);

  const onExpire = useCallback(() => void refresh(), [refresh]);

  if (loading) return <PaymentSkeleton />;

  if (error && !data) {
    return (
      <Message
        title="Pembayaran belum berhasil dimuat"
        body={error}
        actionLabel="Coba Lagi"
        onAction={() => void refresh()}
      />
    );
  }

  if (!data) {
    return (
      <Message
        title="Pembayaran tidak ditemukan"
        body="Pesanan ini belum punya transaksi pembayaran."
        actionLabel="Lihat Pesanan"
        href="/orders"
      />
    );
  }

  const view = STATUS_VIEW[data.status];
  const final = isFinalStatus(data.status);
  const info = methodInfo(data.method);

  return (
    <div className="kc-pay stack-md">
      <header className="kc-pay__head">
        <span className="kc-pay__brand" aria-hidden="true">
          KOMIT
        </span>
        <PaymentStatusBadge status={data.status} />
        <p className="kc-pay__amount" style={{ marginTop: 'var(--sp-md)' }}>
          {formatRupiah(data.grossAmount)}
        </p>
        <p className="kc-pay__ref">
          Pesanan {data.midtransOrderId ?? data.orderId}
        </p>
        {!final && (
          <div style={{ marginTop: 'var(--sp-md)' }}>
            <Countdown expiryTime={data.expiryTime} onExpire={onExpire} />
          </div>
        )}
      </header>

      <Card className="stack-sm">
        <p className="t-body-md">{view.description}</p>
        {data.paidAt && (
          <p className="t-caption-sm">
            Dibayar pada{' '}
            {new Date(data.paidAt).toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Jakarta',
            })}{' '}
            WIB
          </p>
        )}
      </Card>

      {/* Instruksi hanya berguna selama pembayaran masih bisa diselesaikan. */}
      {!final && info?.instruction === 'qris' && <QrisView payment={data} />}
      {!final && (info?.instruction === 'va' || info?.instruction === 'bill') && (
        <VirtualAccountView payment={data} />
      )}
      {!final && info?.instruction === 'ewallet' && <EwalletView payment={data} />}

      {error && <p className="form-error">{error}</p>}

      <div className="stack-sm">
        {!final && (
          <button
            type="button"
            className="kc-btn kc-btn--primary kc-btn--block"
            disabled={checking}
            onClick={() => void refresh()}
          >
            <RefreshCw size={15} aria-hidden="true" />{' '}
            {checking ? 'Memeriksa…' : 'Cek Status Pembayaran'}
          </button>
        )}

        <Link
          href={`/orders/${data.orderId}`}
          className="kc-btn kc-btn--secondary kc-btn--block"
        >
          Lihat Detail Pesanan
        </Link>
        <Link href="/orders" className="kc-btn kc-btn--ghost kc-btn--block">
          Kembali ke Pesanan
        </Link>
      </div>

      {!final && (
        <p className="t-caption-sm" style={{ textAlign: 'center' }}>
          Halaman ini memeriksa statusnya sendiri secara berkala. Anda boleh
          menutupnya — pembayaran tetap tercatat.
        </p>
      )}
    </div>
  );
}

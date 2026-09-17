'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { Order } from '@shared/api';

function rupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Menunggu Pembayaran',
  PAID: 'Sudah Dibayar',
  PROCESSING: 'Diproses',
  READY_FOR_DELIVERY: 'Siap Dikirim',
  OUT_FOR_DELIVERY: 'Dalam Pengiriman',
  DELIVERED: 'Terkirim',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

function statusClass(status: string) {
  if (status === 'COMPLETED' || status === 'DELIVERED') return 'badge-ok';
  if (status === 'CANCELLED') return 'badge-out';
  return 'badge-low';
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api
      .getOrderHistory()
      .then(setOrders)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="state">Memuat pesanan…</div>;

  return (
    <>
      <h1 className="page-title">Pesanan Saya</h1>
      <p className="page-sub">Riwayat transaksi Anda di KOPDES.</p>

      {error && <div className="error">{error}</div>}

      {!error && orders.length === 0 ? (
        <div className="empty">
          Belum ada pesanan.
          <br />
          <Link href="/" className="muted">
            ← Mulai belanja
          </Link>
        </div>
      ) : (
        <div className="orders">
          {orders.map((o) => {
            const itemCount = o.items?.length ?? 0;
            const date = new Date(o.createdAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            return (
              <div className="order-card" key={o.id}>
                <div className="order-top">
                  <span className="oid">#{o.id.slice(0, 8).toUpperCase()}</span>
                  <span className={`badge ${statusClass(o.status)}`}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <div className="order-meta muted">
                  {date} • {itemCount} item • {o.paymentMethod}
                </div>
                <div className="order-bottom">
                  <span className="muted">Total</span>
                  <span className="order-total">
                    {rupiah(Number(o.totalAmount))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

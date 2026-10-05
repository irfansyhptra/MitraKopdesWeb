'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import { formatRupiah, orderNumber } from '@shared/format';
import type { SellerOrder } from '@shared/api';
import { MapPin, Package, ReceiptText, UserIcon } from '@shared/design/icons';

const TABS = [
  { id: 'new', label: 'Baru', accepts: ['PENDING', 'PAID'] },
  { id: 'processing', label: 'Diproses', accepts: ['PROCESSING'] },
  { id: 'ready', label: 'Siap Kirim', accepts: ['READY_FOR_DELIVERY'] },
  { id: 'history', label: 'Riwayat', accepts: ['DELIVERED', 'COMPLETED', 'CANCELLED'] },
] as const;

export default function SellerOrdersPage() {
  const orders = useAsync(() => api.getSellerOrders());
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('new');
  const current = TABS.find((item) => item.id === tab)!;
  const filtered = orders.data?.filter((order) => (current.accepts as readonly string[]).includes(order.status)) ?? [];

  return <>
    <div className="staff-page-head seller-page-heading"><div><h1>Pesanan</h1><p>Pantau pesanan dari masuk hingga selesai</p></div><button className="staff-btn staff-btn--ghost" onClick={orders.reload}>Perbarui</button></div>
    <div className="staff-segments" role="tablist" aria-label="Status pesanan">
      {TABS.map((item) => <button key={item.id} type="button" role="tab" aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </div>
    {orders.loading && <div className="staff-stack">{[0, 1].map((item) => <StaffSkeleton height={260} key={item} />)}</div>}
    {!orders.loading && orders.error && <StaffError message={orders.error} onRetry={orders.reload} />}
    {!orders.loading && !orders.error && !filtered.length && <div className="staff-surface staff-empty"><ReceiptText size={30} /><p>Belum ada pesanan pada bagian {current.label.toLowerCase()}.</p></div>}
    <div className="seller-order-grid">{filtered.map((order) => <SellerOrderCard key={order.id} order={order} onChanged={orders.reload} />)}</div>
  </>;
}

function SellerOrderCard({ order, onChanged }: { order: SellerOrder; onChanged: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = order.status === 'PENDING' || order.status === 'PAID'
    ? { status: 'PROCESSING', label: 'Proses pesanan' }
    : order.status === 'PROCESSING'
      ? { status: 'READY_FOR_DELIVERY', label: 'Tandai siap dikirim' }
      : null;
  async function update() {
    if (!next || busy) return;
    setBusy(true);
    try { await api.updateSellerOrderStatus(order.id, next.status); onChanged(); }
    catch (error) { window.alert((error as Error).message); setBusy(false); }
  }
  async function openChat(target: 'customer' | 'courier') {
    setBusy(true);
    try {
      const conversation = await api.startSellerOrderConversation(order.id, target);
      router.push(`/chat/${conversation.id}`);
    } catch (error) { window.alert((error as Error).message); setBusy(false); }
  }
  return <article className="staff-surface seller-order-card">
    <header><div><strong>{orderNumber(order)}</strong><time>{new Date(order.createdAt).toLocaleString('id-ID')}</time></div><span className="staff-chip">{order.status.replaceAll('_', ' ')}</span></header>
    <div className="seller-order-card__meta"><p><UserIcon size={15} />{order.customer.name}</p><p><MapPin size={15} />{order.deliveryAddress.street}, {order.deliveryAddress.city}</p></div>
    <div className="seller-order-items">
      {order.items?.map((item) => <div key={item.id}><span><Package size={15} />{item.umkmProduct?.name ?? 'Produk UMKM'} ×{item.quantity}</span><strong>{formatRupiah(Number(item.price) * item.quantity)}</strong></div>)}
    </div>
    <div className="seller-order-total"><span>Total Pendapatan</span><strong>{formatRupiah(Number(order.totalAmount))}</strong></div>
    <dl className="seller-order-detail"><div><dt>Pembayaran</dt><dd>{order.paymentMethod} · {order.paymentStatus}</dd></div>{order.delivery?.courier && <div><dt>Kurir</dt><dd>{order.delivery.courier.name}</dd></div>}</dl>
    <div className="staff-actions"><button type="button" className="staff-btn staff-btn--ghost" disabled={busy} onClick={() => void openChat('customer')}>Chat Pembeli</button>{order.delivery?.courier && <button type="button" className="staff-btn staff-btn--ghost" disabled={busy} onClick={() => void openChat('courier')}>Chat Kurir</button>}{next && <button type="button" className="staff-btn" disabled={busy} onClick={() => void update()}>{busy ? 'Memperbarui…' : next.label}</button>}</div>
  </article>;
}

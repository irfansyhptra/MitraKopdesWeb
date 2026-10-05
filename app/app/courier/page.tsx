'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { StaffError, StaffSection, StaffSkeleton } from '@/components/staff/Section';
import { formatRupiah } from '@shared/format';
import type { CourierDelivery } from '@shared/api';
import { LocateFixed, MapPin, Package, ReceiptText, UserIcon } from '@shared/design/icons';

const FINISHED = new Set(['COURIER_DELIVERED', 'CUSTOMER_CONFIRMED', 'COMPLETED']);

export default function CourierDashboardPage() {
  const deliveries = useAsync(() => api.getCourierDeliveries());
  const [history, setHistory] = useState(false);
  const rows = useMemo(() => (deliveries.data ?? []).filter((item) => history ? FINISHED.has(item.status) : !FINISHED.has(item.status)), [deliveries.data, history]);
  const completed = deliveries.data?.filter((item) => FINISHED.has(item.status)).length ?? 0;
  return <>
    <div className="staff-page-head seller-page-heading"><div><h1>Dasbor Kurir</h1><p>Pengiriman yang ditugaskan kepada akun Anda</p></div><button className="staff-btn staff-btn--ghost" onClick={deliveries.reload}>Perbarui</button></div>
    <section className="staff-surface courier-metrics"><div><span>Penugasan</span><strong>{deliveries.data?.length ?? '—'}</strong></div><div><span>Selesai</span><strong>{completed}</strong></div><div><span>Aktif</span><strong>{(deliveries.data?.length ?? 0) - completed}</strong></div></section>
    <div className="staff-segments" role="group" aria-label="Daftar pengiriman"><button aria-pressed={!history} onClick={() => setHistory(false)}>Tugas Aktif</button><button aria-pressed={history} onClick={() => setHistory(true)}>Riwayat</button></div>
    {deliveries.loading && <div className="staff-stack"><StaffSkeleton height={240} /><StaffSkeleton height={240} /></div>}
    {!deliveries.loading && deliveries.error && <StaffError message={deliveries.error} onRetry={deliveries.reload} />}
    {!deliveries.loading && !deliveries.error && !rows.length && <div className="staff-surface staff-empty"><Package size={28} /><p>{history ? 'Belum ada riwayat pengiriman.' : 'Tidak ada tugas pengiriman aktif.'}</p></div>}
    <StaffSection title={history ? 'Riwayat Pengiriman' : 'Tugas Pengiriman Aktif'}>
      <div className="seller-order-grid">{rows.map((delivery) => <DeliveryCard delivery={delivery} onChanged={deliveries.reload} key={delivery.id} />)}</div>
    </StaffSection>
  </>;
}

function DeliveryCard({ delivery, onChanged }: { delivery: CourierDelivery; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const address = delivery.order?.deliveryAddress;
  async function markDelivered() {
    setBusy(true);
    try { await api.markCourierDelivered(delivery.id); onChanged(); }
    catch (error) { window.alert((error as Error).message); setBusy(false); }
  }
  function sendLocation() {
    if (!navigator.geolocation) { window.alert('Browser ini tidak mendukung lokasi.'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try { await api.updateCourierLocation(delivery.id, coords.latitude, coords.longitude); window.alert('Lokasi terbaru sudah dikirim.'); }
        catch (error) { window.alert((error as Error).message); }
        finally { setBusy(false); }
      },
      (error) => { window.alert(error.message); setBusy(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }
  return <article className="staff-surface seller-order-card">
    <header><div><strong>#{delivery.id.slice(0, 8).toUpperCase()}</strong><time>{new Date(delivery.createdAt).toLocaleString('id-ID')}</time></div><span className="staff-chip">{delivery.status.replaceAll('_', ' ')}</span></header>
    <div className="seller-order-card__meta"><p><UserIcon size={15} />{delivery.order?.customer?.name ?? 'Pelanggan'}</p><p><MapPin size={15} />{address ? `${address.street}, ${address.city}, ${address.state}` : 'Alamat belum tersedia'}</p></div>
    {!!delivery.order?.items?.length && <div className="seller-order-items">{delivery.order.items.map((item) => <div key={item.id}><span><Package size={15} />{item.product?.name ?? item.umkmProduct?.name ?? 'Produk'} ×{item.quantity}</span></div>)}</div>}
    {delivery.order?.totalAmount != null && <div className="seller-order-total"><span><ReceiptText size={14} /> Total pesanan</span><strong>{formatRupiah(Number(delivery.order.totalAmount))}</strong></div>}
    {!FINISHED.has(delivery.status) && <div className="staff-actions"><button className="staff-btn staff-btn--ghost" type="button" disabled={busy} onClick={sendLocation}><LocateFixed size={16} />Kirim Lokasi</button><button className="staff-btn" type="button" disabled={busy} onClick={() => void markDelivered()}>{busy ? 'Memproses…' : 'Barang Sudah Diantar'}</button></div>}
  </article>;
}

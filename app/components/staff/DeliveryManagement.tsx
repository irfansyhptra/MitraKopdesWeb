'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useStaff } from './StaffContext';
import { useAsync } from './useAsync';
import { StaffAccess, StaffDialog, StaffPageHeader } from './StaffPage';
import { StaffError, StaffSkeleton } from './Section';
import { Permissions, type AdminDelivery, type DeliveryStatusWire } from '@shared/api';
import { Bike, MapPin, Package, Phone, Truck } from '@shared/design/icons';

const LABELS: Record<DeliveryStatusWire, string> = {
  ASSIGNED: 'Ditugaskan', ACCEPTED: 'Diterima Kurir', PICKED_UP: 'Barang Diambil',
  IN_TRANSIT: 'Dalam Perjalanan', COURIER_DELIVERED: 'Menunggu Konfirmasi',
  CUSTOMER_CONFIRMED: 'Dikonfirmasi Penerima', COMPLETED: 'Selesai',
};
const STEPS: DeliveryStatusWire[] = ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'COURIER_DELIVERED', 'CUSTOMER_CONFIRMED', 'COMPLETED'];
const editable = (delivery: AdminDelivery) => ['ASSIGNED', 'ACCEPTED'].includes(delivery.status);
const reference = (delivery: AdminDelivery) => delivery.order?.orderNumber || delivery.order?.id.slice(-8).toUpperCase() || delivery.id.slice(-8).toUpperCase();

export function DeliveryManagement({ mode = 'deliveries' }: { mode?: 'deliveries' | 'couriers' | 'tracking' }) {
  return <StaffAccess permission={Permissions.deliveryRead}><Suspense fallback={<StaffSkeleton height={240} />}><DeliveryContent mode={mode} /></Suspense></StaffAccess>;
}

function DeliveryContent({ mode }: { mode: 'deliveries' | 'couriers' | 'tracking' }) {
  const { can } = useStaff();
  const params = useSearchParams();
  const selectedId = params.get('deliveryId');
  const deliveries = useAsync(() => api.getDeliveries());
  const couriers = useAsync(() => api.getCouriers());
  const [filter, setFilter] = useState('all');
  const [assigning, setAssigning] = useState<AdminDelivery | null>(null);
  const [removing, setRemoving] = useState<AdminDelivery | null>(null);
  const [courierId, setCourierId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = () => { deliveries.reload(); couriers.reload(); };
  const selected = deliveries.data?.find((delivery) => delivery.id === selectedId);
  const list = deliveries.data?.filter((delivery) => filter === 'all' || (filter === 'unassigned' ? !delivery.courier : filter === 'complete' ? ['COMPLETED', 'CUSTOMER_CONFIRMED'].includes(delivery.status) : !['COMPLETED', 'CUSTOMER_CONFIRMED'].includes(delivery.status) && !!delivery.courier));

  async function saveAssignment() {
    if (busy || (!assigning && !removing)) return;
    setBusy(true); setError(null);
    try {
      if (assigning) await api.assignCourier(assigning.id, courierId);
      if (removing) await api.unassignCourier(removing.id);
      setAssigning(null); setRemoving(null); reload();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return <>
    <StaffPageHeader title={mode === 'tracking' ? 'Lacak Pesanan' : mode === 'couriers' ? 'Kirim ke Kurir' : 'Atur Pengiriman'}
      description={mode === 'tracking' ? 'Pantau status pengantaran pesanan' : 'Kelola kurir dan pengantaran koperasi'} onRefresh={reload} />
    <div className="staff-stack">
      {mode === 'couriers' && <section className="staff-surface staff-stack">
        <h2 className="staff-section__title">Kurir Koperasi</h2>
        {couriers.loading ? <StaffSkeleton height={80} /> : couriers.error ? <StaffError message={couriers.error} onRetry={couriers.reload} /> : couriers.data?.length ?
          <div className="staff-courier-grid">{couriers.data.map((courier) => <div className="staff-courier" key={courier.id}>
            <span className="staff-feature-icon"><Bike size={22} /></span><div><strong>{courier.name}</strong><p className="staff-muted">{courier.activeCount} pengantaran aktif</p></div>
            {courier.phone && <a className="staff-icon-btn" href={`tel:${courier.phone}`} aria-label={`Telepon ${courier.name}`}><Phone size={18} /></a>}
          </div>)}</div> : <p className="staff-muted">Belum ada kurir terdaftar.</p>}
      </section>}
      {mode === 'tracking' && selectedId && !deliveries.loading && !deliveries.error && (selected ?
        <section className="staff-surface staff-stack">
          <div className="staff-card-heading"><span className="staff-feature-icon"><Truck size={24} /></span><div><h2 className="staff-section__title">Pesanan #{reference(selected)}</h2><p className="staff-muted">{selected.order?.customer?.name || 'Pelanggan'}</p></div></div>
          <DeliveryAddress delivery={selected} />
          <p className="staff-muted">Kurir: {selected.courier?.name || 'Belum ditugaskan'}</p>
          <ol className="staff-progress" aria-label="Tahapan pengantaran">{STEPS.map((step, index) => <li key={step} data-done={index <= STEPS.indexOf(selected.status)} aria-current={step === selected.status ? 'step' : undefined}>
            <span>{index + 1}</span><p>{step === 'ASSIGNED' && !selected.courier ? 'Menunggu Penugasan' : LABELS[step]}</p>
          </li>)}</ol>
          <p className="staff-muted">Status terakhir dari pengantaran. Gunakan muat ulang untuk melihat pembaruan.</p>
        </section> : <div className="staff-surface staff-empty">Pengantaran tidak ditemukan atau tidak dapat diakses.</div>)}
      <div className="staff-segments" aria-label="Filter pengantaran">{[['all', 'Semua'], ['unassigned', 'Belum Ditugaskan'], ['active', 'Berjalan'], ['complete', 'Selesai']].map(([id, label]) =>
        <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
      {deliveries.loading ? <StaffSkeleton height={220} /> : deliveries.error ? <StaffError message={deliveries.error} onRetry={deliveries.reload} /> : !list?.length ?
        <div className="staff-surface staff-empty"><Package size={28} aria-hidden="true" /><p>Belum ada pengantaran pada filter ini.</p></div> :
        <div className="staff-delivery-grid">{list.map((delivery) => <article className="staff-surface staff-stack" key={delivery.id}>
          <div className="staff-card-heading"><h2 className="staff-section__title">#{reference(delivery)}</h2><span className="staff-chip">{!delivery.courier ? 'Menunggu Penugasan' : LABELS[delivery.status]}</span></div>
          <strong>{delivery.order?.customer?.name || 'Pelanggan'}</strong>
          <DeliveryAddress delivery={delivery} />
          <p className="staff-muted"><Bike size={16} aria-hidden="true" /> {delivery.courier?.name || 'Kurir belum ditugaskan'}</p>
          <div className="staff-actions">
            <Link className="staff-btn staff-btn--ghost" href={`/pegawai/lacak?deliveryId=${encodeURIComponent(delivery.id)}`}>Lacak Pesanan</Link>
            {editable(delivery) && can(Permissions.deliveryAssign) && <button className="staff-btn" onClick={() => { setAssigning(delivery); setCourierId(delivery.courier?.id ?? ''); setError(null); }}>{delivery.courier ? 'Ganti Kurir' : 'Pilih Kurir'}</button>}
            {editable(delivery) && delivery.courier && can(Permissions.deliveryUnassign) && <button className="staff-btn staff-btn--outline" onClick={() => { setRemoving(delivery); setError(null); }}>Lepas Kurir</button>}
          </div>
        </article>)}</div>}
    </div>
    {(assigning || removing) && <StaffDialog title={assigning ? 'Pilih Kurir' : 'Lepas penugasan kurir?'} busy={busy} onClose={() => { setAssigning(null); setRemoving(null); }}>
      <div className="staff-stack">
        <p className="staff-muted">Pesanan #{reference((assigning || removing)!)}</p>
        {assigning && (couriers.loading ? <StaffSkeleton height={48} /> : couriers.error ? <StaffError message={couriers.error} onRetry={couriers.reload} /> : <div className="field">
          <label htmlFor="delivery-courier">Kurir yang bertugas</label>
          <select id="delivery-courier" value={courierId} onChange={(e) => setCourierId(e.target.value)} disabled={busy}>
            <option value="">Pilih kurir</option>{couriers.data?.map((courier) => <option key={courier.id} value={courier.id}>{courier.name} · {courier.activeCount} pengantaran aktif</option>)}
          </select>{!couriers.data?.length && <p className="staff-muted">Belum ada kurir terdaftar.</p>}
        </div>)}
        {removing && <p>Pesanan akan kembali menunggu penugasan kurir.</p>}
        {error && <p role="alert" className="form-error">{error}</p>}
        <div className="staff-actions"><button className="staff-btn staff-btn--ghost" disabled={busy} onClick={() => { setAssigning(null); setRemoving(null); }}>Batal</button>
          <button className="staff-btn" disabled={busy || (!!assigning && (!courierId || couriers.loading || !!couriers.error))} onClick={() => void saveAssignment()}>{busy ? 'Menyimpan…' : assigning ? 'Tugaskan Kurir' : 'Lepas Kurir'}</button></div>
      </div>
    </StaffDialog>}
  </>;
}

function DeliveryAddress({ delivery }: { delivery: AdminDelivery }) {
  const address = delivery.order?.deliveryAddress;
  return <p className="staff-muted staff-address"><MapPin size={16} aria-hidden="true" /><span>{address ? [address.street, address.city, address.state].filter(Boolean).join(', ') : 'Alamat belum tersedia'}</span></p>;
}

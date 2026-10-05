'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useStaff } from '@/components/staff/StaffContext';
import { useAsync } from '@/components/staff/useAsync';
import { StaffAccess, StaffPageHeader } from '@/components/staff/StaffPage';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import { Permissions } from '@shared/api';
import type { AdminMitra } from '@shared/api';
import { Check, MapPin, Store, X } from '@shared/design/icons';

const FILTERS = [
  ['', 'Semua'],
  ['PENDING_VERIFICATION', 'Menunggu'],
  ['ACTIVE', 'Aktif'],
  ['REJECTED', 'Ditolak'],
  ['SUSPENDED', 'Ditangguhkan'],
] as const;

export default function AdminMitraPage() {
  return <StaffAccess permission={Permissions.mitraRead}><MitraList /></StaffAccess>;
}

function MitraList() {
  const { can } = useStaff();
  const [status, setStatus] = useState('');
  const mitra = useAsync(() => api.getAdminMitra(status || undefined), [status]);
  return <>
    <StaffPageHeader title="Pengelolaan Mitra UMKM" description="Verifikasi usaha yang bergabung ke ekosistem koperasi" onRefresh={mitra.reload} />
    <div className="seller-filter-row" role="group" aria-label="Status mitra">{FILTERS.map(([value, label]) => <button className="staff-chip" aria-pressed={status === value} type="button" onClick={() => setStatus(value)} key={value}>{label}</button>)}</div>
    {mitra.loading && <div className="staff-stack">{[0, 1, 2].map((item) => <StaffSkeleton height={150} key={item} />)}</div>}
    {!mitra.loading && mitra.error && <StaffError message={mitra.error} onRetry={mitra.reload} />}
    {!mitra.loading && !mitra.error && !mitra.data?.length && <div className="staff-surface staff-empty">Belum ada mitra pada kategori ini.</div>}
    <div className="seller-order-grid">{mitra.data?.map((item) => <MitraCard item={item} canVerify={can(Permissions.mitraVerify)} onChanged={mitra.reload} key={item.id} />)}</div>
  </>;
}

function MitraCard({ item, canVerify, onChanged }: { item: AdminMitra; canVerify: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  async function update(status: 'ACTIVE' | 'REJECTED' | 'SUSPENDED') {
    const reason = status === 'REJECTED' ? window.prompt('Alasan penolakan (opsional):')?.trim() : undefined;
    if (status === 'REJECTED' && reason === undefined) return;
    setBusy(true);
    try { await api.verifyAdminMitra(item.id, status, reason || undefined); onChanged(); }
    catch (error) { window.alert((error as Error).message); setBusy(false); }
  }
  return <article className="staff-surface seller-order-card">
    <header><span className="staff-feature-icon"><Store size={20} /></span><span className="staff-chip">{item.status.replaceAll('_', ' ')}</span></header>
    <div><h2 className="staff-section__title">{item.businessName}</h2><p className="staff-muted">{item.user?.name ?? 'Pemilik'} · {item.productCount} produk</p></div>
    <p className="staff-muted"><MapPin size={13} /> {item.address || 'Alamat belum diisi'}</p>
    {item.rejectionReason && <p className="form-error">Alasan: {item.rejectionReason}</p>}
    {canVerify && <div className="staff-actions">
      {item.status !== 'ACTIVE' && <button className="staff-btn" disabled={busy} onClick={() => void update('ACTIVE')}><Check size={15} />Aktifkan</button>}
      {item.status !== 'REJECTED' && <button className="staff-btn staff-btn--ghost" disabled={busy} onClick={() => void update('REJECTED')}><X size={15} />Tolak</button>}
      {item.status === 'ACTIVE' && <button className="staff-btn staff-btn--outline" disabled={busy} onClick={() => void update('SUSPENDED')}>Tangguhkan</button>}
    </div>}
  </article>;
}

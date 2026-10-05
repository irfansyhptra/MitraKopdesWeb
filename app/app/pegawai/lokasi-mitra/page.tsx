'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { StaffAccess, StaffPageHeader } from '@/components/staff/StaffPage';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import { Permissions, type AdminMitra } from '@shared/api';
import { MapPin } from '@shared/design/icons';

export default function MitraLocationsPage() {
  return <StaffAccess permission={Permissions.umkmLocationUpdate}><LocationList /></StaffAccess>;
}

function LocationList() {
  const mitra = useAsync<AdminMitra[]>(() => api.getAdminMitra());
  const missing = mitra.data?.filter((item) => item.latitude == null || item.longitude == null).length ?? 0;
  return <><StaffPageHeader title="Lokasi Mitra UMKM" description="Koordinat ini dipakai pencarian toko terdekat di aplikasi dan website" onRefresh={mitra.reload} />
    {!mitra.loading && !mitra.error && <div className="staff-surface staff-muted" style={{ marginBottom: 'var(--sp-base)' }}>{missing ? `${missing} dari ${mitra.data?.length ?? 0} mitra belum memiliki koordinat.` : `Semua ${mitra.data?.length ?? 0} mitra sudah memiliki koordinat.`}</div>}
    {mitra.loading && <StaffSkeleton height={180} />}{mitra.error && <StaffError message={mitra.error} onRetry={mitra.reload} />}
    <div className="seller-product-grid">{mitra.data?.map((item) => <LocationCard mitra={item} onSaved={mitra.reload} key={item.id} />)}</div>
  </>;
}

function LocationCard({ mitra, onSaved }: { mitra: AdminMitra; onSaved: () => void }) {
  const [latitude, setLatitude] = useState(mitra.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(mitra.longitude?.toString() ?? '');
  const [category, setCategory] = useState(mitra.category ?? 'LAINNYA');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function save() {
    const lat = Number(latitude); const lng = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) { setMessage('Koordinat tidak valid.'); return; }
    setBusy(true); setMessage(null);
    try { await api.updateAdminMitraLocation(mitra.id, lat, lng, category); setMessage('Lokasi tersimpan.'); onSaved(); }
    catch (reason) { setMessage((reason as Error).message); setBusy(false); }
  }
  return <article className="staff-surface stack-md"><div className="staff-card-heading"><div><h2 className="staff-section__title">{mitra.businessName}</h2><p className="staff-muted"><MapPin size={13} />{mitra.address}</p></div><span className="staff-chip">{mitra.latitude != null && mitra.longitude != null ? 'Sudah diisi' : 'Belum ada lokasi'}</span></div><div className="staff-form-grid"><div className="field"><label htmlFor={`lat-${mitra.id}`}>Latitude</label><input id={`lat-${mitra.id}`} inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></div><div className="field"><label htmlFor={`lng-${mitra.id}`}>Longitude</label><input id={`lng-${mitra.id}`} inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></div></div><div className="field"><label htmlFor={`category-${mitra.id}`}>Kategori usaha</label><select id={`category-${mitra.id}`} value={category} onChange={(event) => setCategory(event.target.value)}>{['KULINER','SWALAYAN','MINUMAN','KERAJINAN','JASA','LAINNYA'].map((value) => <option value={value} key={value}>{value}</option>)}</select></div>{message && <p className={message === 'Lokasi tersimpan.' ? 'staff-muted' : 'form-error'}>{message}</p>}<button type="button" className="staff-btn" disabled={busy} onClick={() => void save()}>{busy ? 'Menyimpan…' : 'Simpan Lokasi'}</button></article>;
}

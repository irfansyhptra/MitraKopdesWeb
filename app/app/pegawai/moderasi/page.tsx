'use client';
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { StaffAccess, StaffPageHeader } from '@/components/staff/StaffPage';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import { formatRupiah } from '@shared/format';
import { Permissions } from '@shared/api';
import type { AdminUmkmProduct } from '@shared/api';
import { ImagePlus, Package } from '@shared/design/icons';

export default function ModerationPage() {
  return <StaffAccess permission={Permissions.umkmProductTakedown}><ModerationList /></StaffAccess>;
}

function ModerationList() {
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const products = useAsync(() => api.getAdminUmkmProducts(search || undefined), [search]);
  return <>
    <StaffPageHeader title="Moderasi Produk UMKM" description="Atur produk mitra yang boleh tampil di marketplace" onRefresh={products.reload} />
    <form className="seller-search staff-surface" onSubmit={(event) => { event.preventDefault(); setSearch(draft.trim()); }}><input aria-label="Cari produk UMKM" placeholder="Cari nama produk" value={draft} onChange={(event) => setDraft(event.target.value)} /><button className="staff-btn" type="submit">Cari</button></form>
    {products.loading && <div className="seller-product-grid">{[0, 1, 2].map((item) => <StaffSkeleton height={190} key={item} />)}</div>}
    {!products.loading && products.error && <StaffError message={products.error} onRetry={products.reload} />}
    {!products.loading && !products.error && !products.data?.length && <div className="staff-surface staff-empty"><Package size={28} />Belum ada produk UMKM.</div>}
    <div className="seller-product-grid">{products.data?.map((product) => <ModerationCard product={product} onChanged={products.reload} key={product.id} />)}</div>
  </>;
}

function ModerationCard({ product, onChanged }: { product: AdminUmkmProduct; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const image = product.images?.find((item) => item.isPrimary) ?? product.images?.[0];
  async function toggle() {
    const reason = product.isActive ? window.prompt('Alasan produk diturunkan (opsional):')?.trim() : undefined;
    if (product.isActive && reason === undefined) return;
    setBusy(true);
    try { await api.setAdminUmkmProductActive(product.id, !product.isActive, reason || undefined); onChanged(); }
    catch (error) { window.alert((error as Error).message); setBusy(false); }
  }
  return <article className="staff-surface seller-product-card">
    <div className="seller-product-card__image">{image ? <img src={image.url} alt={product.name} loading="lazy" /> : <ImagePlus size={26} />}</div>
    <div className="seller-product-card__body"><div><span className="staff-chip">{product.isActive ? 'Tayang' : 'Diturunkan'}</span><span className="staff-chip">{product.isApproved ? 'Disetujui' : 'Belum disetujui'}</span></div><h2>{product.name}</h2><p className="staff-muted">{product.umkm?.businessName ?? 'Mitra UMKM'}</p><strong>{formatRupiah(Number(product.price))}</strong><p className="staff-muted">Stok {product.stock}</p><button className={product.isActive ? 'staff-btn staff-btn--outline' : 'staff-btn'} disabled={busy} onClick={() => void toggle()}>{busy ? 'Memproses…' : product.isActive ? 'Turunkan Produk' : 'Tayangkan Kembali'}</button></div>
  </article>;
}

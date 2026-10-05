'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { StaffAccess, StaffPageHeader } from '@/components/staff/StaffPage';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import { Permissions, type Category } from '@shared/api';
import { LayoutGrid, Plus } from '@shared/design/icons';

export default function CategoriesPage() {
  return <StaffAccess permission={Permissions.categoryManage}><CategoryList /></StaffAccess>;
}

function CategoryList() {
  const categories = useAsync<Category[]>(() => api.getCategories());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await api.createCategory(name.trim(), description.trim() || undefined); setOpen(false); setName(''); setDescription(''); categories.reload(); }
    catch (reason) { setError((reason as Error).message); setBusy(false); }
  }
  return <>
    <StaffPageHeader title="Kelola Kategori" description="Kategori yang sama dipakai katalog aplikasi dan website" onRefresh={categories.reload} />
    <button type="button" className="staff-btn" style={{ width: 'auto', marginBottom: 'var(--sp-base)' }} onClick={() => { setBusy(false); setOpen(true); }}><Plus size={15} />Tambah Kategori</button>
    {categories.loading && <StaffSkeleton height={150} />}
    {!categories.loading && categories.error && <StaffError message={categories.error} onRetry={categories.reload} />}
    {!categories.loading && !categories.error && !categories.data?.length && <div className="staff-surface staff-empty">Belum ada kategori.</div>}
    <div className="seller-stat-grid">{categories.data?.map((category) => <article className="staff-surface seller-stat" key={category.id}><span className="staff-feature-icon"><LayoutGrid size={20} /></span><strong>{category.name}</strong>{category.description && <small>{category.description}</small>}<span className="staff-chip">{category.group === 'FOOD' ? 'Makanan' : 'Ritel'}</span></article>)}</div>
    {open && <div className="staff-modal" role="dialog" aria-modal="true" aria-label="Tambah kategori" onClick={() => setOpen(false)}><form className="staff-surface stack-md staff-modal__panel" onSubmit={(event) => void submit(event)} onClick={(event) => event.stopPropagation()}><h2 className="staff-section__title">Kategori Baru</h2><div className="field"><label htmlFor="category-name">Nama kategori</label><input id="category-name" required value={name} onChange={(event) => setName(event.target.value)} /></div><div className="field"><label htmlFor="category-desc">Deskripsi (opsional)</label><textarea id="category-desc" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></div>{error && <p className="form-error">{error}</p>}<div className="staff-actions"><button type="button" className="staff-btn staff-btn--ghost" onClick={() => setOpen(false)}>Batal</button><button className="staff-btn" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button></div></form></div>}
  </>;
}

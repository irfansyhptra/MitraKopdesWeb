'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import { formatRupiah } from '@shared/format';
import type { SellerProduct } from '@shared/api';
import { ImagePlus, Package, Plus, Search, Trash2 } from '@shared/design/icons';

type StockFilter = '' | 'safe' | 'low' | 'out';

export default function SellerProductsPage() {
  return <Suspense fallback={<StaffSkeleton height={360} />}><SellerProducts /></Suspense>;
}

function SellerProducts() {
  const params = useSearchParams();
  const initialStock = params.get('stock');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stock, setStock] = useState<StockFilter>(
    initialStock === 'safe' || initialStock === 'low' || initialStock === 'out' ? initialStock : '',
  );
  const [page, setPage] = useState(1);
  const categories = useAsync(() => api.getSellerProductCategories());
  const products = useAsync(
    () => api.getSellerProducts({ search, categoryId, stockStatus: stock || undefined, page, limit: 20 }),
    [search, categoryId, stock, page],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => { setPage(1); setSearch(draft.trim()); }, 350);
    return () => window.clearTimeout(timer);
  }, [draft]);

  return <>
    <div className="staff-page-head seller-page-heading">
      <div><h1>Produk Toko</h1><p>Kelola etalase dan ketersediaan produk</p></div>
      <Link className="staff-btn" href="/umkm/products/new"><Plus size={16} />Tambah Produk</Link>
    </div>

    <div className="staff-surface seller-product-tools">
      <label className="seller-search"><Search size={18} /><input aria-label="Cari produk" placeholder="Cari produk di toko Anda" value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
      <div className="seller-filter-row" role="group" aria-label="Status stok">
        {([['', 'Semua'], ['safe', 'Aman'], ['low', 'Menipis'], ['out', 'Habis']] as const).map(([value, label]) => <button type="button" className="staff-chip" aria-pressed={stock === value} key={value} onClick={() => { setStock(value); setPage(1); }}>{label}{products.data ? ` · ${value ? products.data.summary[value] : products.data.meta.total}` : ''}</button>)}
      </div>
      {!!categories.data?.length && <div className="seller-filter-row" role="group" aria-label="Kategori produk">
        <button type="button" className="staff-chip" aria-pressed={!categoryId} onClick={() => { setCategoryId(''); setPage(1); }}>Semua kategori</button>
        {categories.data.map((category) => <button type="button" className="staff-chip" aria-pressed={categoryId === category.id} key={category.id} onClick={() => { setCategoryId(category.id); setPage(1); }}>{category.name} · {category.productCount ?? 0}</button>)}
      </div>}
    </div>

    {products.loading && <div className="seller-product-grid">{[0, 1, 2, 3].map((item) => <StaffSkeleton key={item} height={220} />)}</div>}
    {!products.loading && products.error && <StaffError message={products.error} onRetry={products.reload} />}
    {!products.loading && !products.error && !products.data?.products.length && <div className="staff-surface staff-empty"><Package size={28} /><p>Tidak ada produk yang cocok dengan filter ini.</p></div>}
    {!products.loading && !!products.data?.products.length && <div className="seller-product-grid">
      {products.data.products.map((product) => <SellerProductCard product={product} onChanged={products.reload} key={product.id} />)}
    </div>}

    {products.data && products.data.meta.totalPages > 1 && <nav className="seller-pagination" aria-label="Paginasi produk">
      <button className="staff-btn staff-btn--ghost" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Sebelumnya</button>
      <span>Halaman {page} dari {products.data.meta.totalPages}</span>
      <button className="staff-btn staff-btn--ghost" disabled={page >= products.data.meta.totalPages} onClick={() => setPage((value) => value + 1)}>Berikutnya</button>
    </nav>}
  </>;
}

function SellerProductCard({ product, onChanged }: { product: SellerProduct; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const primary = product.images?.find((image) => image.isPrimary) ?? product.images?.[0];
  async function adjust(delta: number) {
    if (busy) return;
    setBusy(true);
    try { await api.adjustSellerStock(product.id, delta, delta > 0 ? 'Penambahan stok dari website' : 'Pengurangan stok dari website'); onChanged(); }
    catch (error) { window.alert((error as Error).message); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!window.confirm(`Hapus produk “${product.name}”?`)) return;
    setBusy(true);
    try { await api.deleteSellerProduct(product.id); onChanged(); }
    catch (error) { window.alert((error as Error).message); setBusy(false); }
  }
  async function toggle() {
    setBusy(true);
    try { await api.updateSellerProduct(product.id, { isActive: !product.isActive }); onChanged(); }
    catch (error) { window.alert((error as Error).message); setBusy(false); }
  }
  return <article className="staff-surface seller-product-card">
    <Link href={`/umkm/products/${product.id}`} className="seller-product-card__image">
      {primary ? <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={primary.url} alt={product.name} loading="lazy" />
      </> : <ImagePlus size={28} aria-hidden="true" />}
    </Link>
    <div className="seller-product-card__body">
      <div><span className="staff-chip">{product.category?.name ?? 'Produk'}</span><span className="staff-chip">{product.isApproved ? 'Disetujui' : 'Menunggu review'}</span></div>
      <Link href={`/umkm/products/${product.id}`}><h2>{product.name}</h2></Link>
      <strong>{formatRupiah(Number(product.price))}</strong>
      <p className="staff-muted">Stok {product.stock} · Rating {product.rating || '—'}</p>
      <div className="seller-product-card__actions">
        <button type="button" className="staff-icon-btn" disabled={busy || product.stock <= 0} onClick={() => void adjust(-1)} aria-label={`Kurangi stok ${product.name}`}>−</button>
        <span>{product.stock}</span>
        <button type="button" className="staff-icon-btn" disabled={busy} onClick={() => void adjust(1)} aria-label={`Tambah stok ${product.name}`}>+</button>
        <button type="button" className="staff-btn staff-btn--ghost" disabled={busy} onClick={() => void toggle()}>{product.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
        <button type="button" className="staff-icon-btn" disabled={busy} onClick={() => void remove()} aria-label={`Hapus ${product.name}`}><Trash2 size={16} /></button>
      </div>
    </div>
  </article>;
}

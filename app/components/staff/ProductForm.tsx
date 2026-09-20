'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAsync } from './useAsync';
import { StaffAccess, StaffPageHeader } from './StaffPage';
import { StaffError, StaffSkeleton } from './Section';
import { Permissions, type Product } from '@shared/api';
import { CircleCheckBig, ImagePlus, X } from '@shared/design/icons';

export function StaffProductForm({ productId }: { productId?: string }) {
  return <StaffAccess permission={productId ? Permissions.productUpdate : Permissions.productCreate}><ProductLoader productId={productId} /></StaffAccess>;
}

function ProductLoader({ productId }: { productId?: string }) {
  const product = useAsync(() => productId ? api.getProduct(productId) : Promise.resolve(null), [productId]);
  return <>
    <StaffPageHeader title={productId ? 'Ubah Produk' : 'Tambah Produk Baru'} description="Lengkapi informasi barang untuk katalog koperasi" />
    {product.loading ? <StaffSkeleton height={360} /> : product.error ? <StaffError message={product.error} onRetry={product.reload} /> : <ProductEditor key={productId ?? 'new'} product={product.data} />}
  </>;
}

function ProductEditor({ product }: { product: Product | null }) {
  const categories = useAsync(() => api.getCategories());
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [preorder, setPreorder] = useState(product?.isPreOrderAllowed ?? false);
  const [active, setActive] = useState(product?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? '').trim();
    const price = Number(text('price'));
    const discount = text('discountPrice') ? Number(text('discountPrice')) : undefined;
    if (!text('name') || !text('description') || !text('categoryId')) { setError('Nama, deskripsi, dan kategori wajib diisi.'); return; }
    if (discount !== undefined && discount >= price) { setError('Harga diskon harus lebih kecil dari harga normal.'); return; }
    setBusy(true); setError(null);
    try {
      await api.saveStaffProduct({
        name: text('name'), description: text('description'), categoryId: text('categoryId'),
        price, discountPrice: discount, stock: Number(text('stock')), minStock: Number(text('minStock')),
        unit: text('unit') || 'pcs', sku: text('sku'), isActive: active, isPreOrderAllowed: preorder,
        ...(preorder && text('availableAt') ? { preOrderAvailableAt: new Date(text('availableAt')).toISOString() } : {}),
      }, files, product?.id);
      setSaved(true);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  if (saved) return <section className="staff-surface staff-saved" role="status">
    <CircleCheckBig size={44} /><h2>{product ? 'Perubahan tersimpan' : 'Produk berhasil ditambahkan'}</h2>
    <p className="staff-muted">Data barang sudah tersimpan di katalog koperasi.</p>
    <Link className="staff-btn" href="/pegawai/stok">Lihat Manajemen Stok</Link>
  </section>;

  return <form onSubmit={(event) => void submit(event)} className="staff-stack staff-product-form">
    <fieldset disabled={busy} className="staff-surface staff-stack">
      <legend className="staff-form-legend">Informasi Produk</legend>
      {categories.error && <StaffError message="Kategori belum berhasil dimuat" onRetry={categories.reload} />}
      <div className="field"><label htmlFor="product-category">Kategori Produk</label><select id="product-category" name="categoryId" required defaultValue={product?.categoryId ?? product?.category?.id ?? ''} disabled={categories.loading || !!categories.error}>
        <option value="">{categories.loading ? 'Memuat kategori…' : 'Pilih kategori'}</option>{categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select></div>
      <div className="field"><label htmlFor="product-name">Nama Produk</label><input id="product-name" name="name" required maxLength={150} defaultValue={product?.name} placeholder="Contoh: Beras premium 5 kg" /></div>
      <div className="field"><label htmlFor="product-description">Deskripsi Produk</label><textarea id="product-description" name="description" required maxLength={2000} rows={4} defaultValue={product?.description} placeholder="Jelaskan kualitas, isi, dan informasi produk" /></div>
      <div className="staff-form-grid">
        <div className="field"><label htmlFor="product-price">Harga (Rp)</label><input id="product-price" name="price" type="number" min="1" step="0.01" required defaultValue={product?.price} placeholder="0" /></div>
        <div className="field"><label htmlFor="product-discount">Harga Diskon (opsional)</label><input id="product-discount" name="discountPrice" type="number" min="0" step="0.01" defaultValue={product?.discountPrice ?? ''} placeholder="Rp" /></div>
        <div className="field"><label htmlFor="product-stock">Stok Awal</label><input id="product-stock" name="stock" type="number" min="0" step="1" required defaultValue={product?.stock ?? 0} /></div>
        <div className="field"><label htmlFor="product-minstock">Stok Minimum</label><input id="product-minstock" name="minStock" type="number" min="0" step="1" required defaultValue={product?.minStock ?? 5} /></div>
        <div className="field"><label htmlFor="product-unit">Satuan</label><input id="product-unit" name="unit" maxLength={20} defaultValue={product?.unit ?? 'pcs'} placeholder="kg, pcs, liter" /></div>
        <div className="field"><label htmlFor="product-sku">SKU / Kode Barang (opsional)</label><input id="product-sku" name="sku" maxLength={50} defaultValue={product?.sku ?? ''} /></div>
      </div>
    </fieldset>
    <fieldset disabled={busy} className="staff-surface staff-stack">
      <legend className="staff-form-legend">Foto Produk</legend>
      <p className="staff-muted">Tambahkan hingga 5 foto JPG, PNG, atau WebP.</p>
      <div className="staff-photos">
        {product?.images?.map((image) => <div className="staff-photo" key={image.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={product.name} />
        </div>)}
        {previews.map((url, index) => <div className="staff-photo" key={url}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Foto baru ${index + 1}`} />
          <button type="button" aria-label={`Hapus foto baru ${index + 1}`} disabled={busy} onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}><X size={16} /></button>
        </div>)}
      </div>
      <label className="staff-upload"><ImagePlus size={22} /><span>Pilih Foto Produk</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Pilih foto produk" onChange={(event) => {
        const selected = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (files.length + selected.length + (product?.images?.length ?? 0) > 5) { setError('Maksimal 5 foto produk.'); return; }
        if (selected.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) { setError('Gunakan foto JPG, PNG, atau WebP.'); return; }
        setError(null); setFiles((current) => [...current, ...selected]);
      }} /></label>
    </fieldset>
    <fieldset disabled={busy} className="staff-surface staff-stack">
      <legend className="staff-form-legend">Ketersediaan</legend>
      <label className="staff-switch"><span><strong>Izinkan Pre-order</strong><small>Pelanggan dapat memesan saat stok tidak mencukupi.</small></span><input type="checkbox" checked={preorder} onChange={(e) => setPreorder(e.target.checked)} /></label>
      {preorder && <div className="field"><label htmlFor="product-available">Perkiraan Tersedia (opsional)</label><input id="product-available" name="availableAt" type="date" defaultValue={product?.preOrderAvailableAt?.slice(0, 10)} /></div>}
      <label className="staff-switch"><span><strong>Produk Aktif</strong><small>Tampilkan produk di etalase koperasi.</small></span><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /></label>
    </fieldset>
    {error && <p role="alert" className="form-error">{error}</p>}
    <button className="staff-btn staff-save" type="submit" disabled={busy || categories.loading || !!categories.error}>{busy ? 'Menyimpan…' : product ? 'Simpan Perubahan' : 'Simpan Produk'}</button>
  </form>;
}

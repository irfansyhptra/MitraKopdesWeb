'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import type { SellerProduct } from '@shared/api';
import { CircleCheckBig, ImagePlus, X } from '@shared/design/icons';

export function SellerProductForm({ productId }: { productId?: string }) {
  const product = useAsync<SellerProduct | null>(
    () => productId ? api.getSellerProduct(productId) : Promise.resolve(null),
    [productId],
  );
  return <>
    <div className="staff-page-head seller-page-heading"><div><h1>{productId ? 'Ubah Produk' : 'Jual Produk Baru'}</h1><p>Informasi yang sama akan tampil di aplikasi dan website pembeli</p></div></div>
    {product.loading ? <StaffSkeleton height={420} /> : product.error ? <StaffError message={product.error} onRetry={product.reload} /> : <Editor key={productId ?? 'new'} product={product.data} />}
  </>;
}

function Editor({ product }: { product: SellerProduct | null }) {
  const categories = useAsync(() => api.getCategories());
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [active, setActive] = useState(product?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? '').trim();
    const name = text('name');
    const description = text('description');
    const categoryId = text('categoryId');
    const price = Number(text('price'));
    const stock = Number(text('stock'));
    if (!name || !description || !categoryId) { setError('Nama, deskripsi, dan kategori wajib diisi.'); return; }
    if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) { setError('Harga dan stok belum valid.'); return; }
    setBusy(true); setError(null);
    try {
      const saved = await api.saveSellerProduct({ name, description, categoryId, price, stock, isActive: active }, files, product?.id);
      setSavedId(saved.id);
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  if (savedId) return <section className="staff-surface staff-saved">
    <CircleCheckBig size={44} /><h2>{product ? 'Perubahan tersimpan' : 'Produk berhasil ditambahkan'}</h2>
    <p className="staff-muted">Produk sudah tersambung ke katalog backend yang sama dengan aplikasi.</p>
    <div className="staff-actions"><Link className="staff-btn" href={`/umkm/products/${savedId}`}>Lihat Produk</Link><Link className="staff-btn staff-btn--ghost" href="/umkm/products">Kembali ke Katalog</Link></div>
  </section>;

  return <form className="staff-stack staff-product-form" onSubmit={(event) => void submit(event)}>
    <fieldset className="staff-surface staff-stack" disabled={busy}>
      <legend className="staff-form-legend">Informasi Produk</legend>
      {categories.error && <StaffError message="Kategori belum berhasil dimuat" onRetry={categories.reload} />}
      <div className="field"><label htmlFor="seller-category">Kategori</label><select id="seller-category" name="categoryId" required defaultValue={product?.categoryId ?? ''}><option value="">Pilih kategori</option>{categories.data?.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></div>
      <div className="field"><label htmlFor="seller-name">Nama Produk</label><input id="seller-name" name="name" required maxLength={150} defaultValue={product?.name} /></div>
      <div className="field"><label htmlFor="seller-description">Deskripsi</label><textarea id="seller-description" name="description" rows={5} required maxLength={2000} defaultValue={product?.description} /></div>
      <div className="staff-form-grid">
        <div className="field"><label htmlFor="seller-price">Harga (Rp)</label><input id="seller-price" name="price" type="number" min="1" step="1" required defaultValue={product?.price} /></div>
        <div className="field"><label htmlFor="seller-stock">Stok</label><input id="seller-stock" name="stock" type="number" min="0" step="1" required defaultValue={product?.stock ?? 0} /></div>
      </div>
    </fieldset>
    <fieldset className="staff-surface staff-stack" disabled={busy}>
      <legend className="staff-form-legend">Foto Produk</legend>
      <div className="staff-photos">
        {product?.images?.map((image) => <div className="staff-photo" key={image.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={product.name} />
        </div>)}
        {previews.map((url, index) => <div className="staff-photo" key={url}>
          {/* Blob lokal untuk pratinjau sebelum unggah. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Foto baru ${index + 1}`} /><button type="button" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}><X size={16} /></button>
        </div>)}
      </div>
      <label className="staff-upload"><ImagePlus size={22} /><span>Pilih Foto Produk</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => {
        const selected = Array.from(event.target.files ?? []); event.target.value = '';
        if (selected.length + files.length + (product?.images?.length ?? 0) > 5) { setError('Maksimal 5 foto produk.'); return; }
        setFiles((current) => [...current, ...selected]);
      }} /></label>
    </fieldset>
    <fieldset className="staff-surface" disabled={busy}>
      <label className="staff-switch"><span><strong>Produk Aktif</strong><small>Tampilkan produk di marketplace setelah lolos verifikasi.</small></span><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /></label>
    </fieldset>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="staff-btn staff-save" type="submit" disabled={busy || categories.loading}>{busy ? 'Menyimpan…' : product ? 'Simpan Perubahan' : 'Simpan Produk'}</button>
  </form>;
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { ApiError } from '@shared/api';
import type { Product } from '@shared/api';

function rupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

function stockBadge(stock: number) {
  if (stock <= 0) return { label: 'Stok habis', cls: 'badge-out' };
  if (stock <= 5) return { label: `Sisa ${stock}`, cls: 'badge-low' };
  return { label: `Stok ${stock}`, cls: 'badge-ok' };
}

export default function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const images = product.images ?? [];
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const outOfStock = product.stock <= 0;
  const badge = stockBadge(product.stock);

  async function addToCart() {
    setMsg(null);
    if (!getToken()) {
      router.push('/login');
      return;
    }
    setLoading(true);
    try {
      await api.addToCart(product.id, qty);
      setMsg({ text: `${qty} × ${product.name} ditambahkan ke keranjang`, error: false });
    } catch (e) {
      const text =
        e instanceof ApiError ? e.message : 'Gagal menambahkan ke keranjang';
      setMsg({ text, error: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="detail">
      {/* Galeri */}
      <div className="gallery">
        <div className="gallery-main">
          {images.length > 0 ? (
            <img src={images[active].url} alt={product.name} />
          ) : (
            <span className="ph">📦</span>
          )}
        </div>
        {images.length > 1 && (
          <div className="thumbs">
            {images.map((img, i) => (
              <button
                key={img.id}
                className={`thumb ${i === active ? 'on' : ''}`}
                onClick={() => setActive(i)}
                aria-label={`Gambar ${i + 1}`}
              >
                <img src={img.url} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="detail-info">
        <div className="cat">
          {(product.category?.name ?? 'Koperasi').toUpperCase()}
        </div>
        <h1>{product.name}</h1>
        <div className="price-row">
          <span className="price">{rupiah(product.price)}</span>
          <span className={`badge ${badge.cls}`}>{badge.label}</span>
        </div>

        <hr />

        <h3>Deskripsi Produk</h3>
        <p className="desc">{product.description}</p>

        {/* Aksi */}
        <div className="buy">
          <div className="qty">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Kurangi"
            >
              −
            </button>
            <span>{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              disabled={qty >= product.stock}
              aria-label="Tambah"
            >
              +
            </button>
          </div>
          <button
            className="btn"
            onClick={addToCart}
            disabled={loading || outOfStock}
          >
            {outOfStock
              ? 'Stok Habis'
              : loading
                ? 'Menambahkan…'
                : 'Tambah ke Keranjang'}
          </button>
        </div>

        {msg && (
          <div className={msg.error ? 'error' : 'success-msg'}>{msg.text}</div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Badge, SellerBadge } from '@shared/design/ui';
import { Package, Plus, Star } from '@shared/design/icons';
import { formatRupiah, toRupiah } from '@shared/format';
import type { MarketplaceProduct } from '@shared/api';

/**
 * Kartu produk katalog — padanan `MarketplaceProductCard` di aplikasi.
 *
 * Dipakai halaman Marketplace dan halaman detail Kopdes. Satu berkas, bukan
 * dua salinan: kartu yang menyalin dirinya sendiri adalah tempat lencana
 * diskon dan tombol keranjang mulai berbeda diam-diam.
 */
export function ProductCard({ product }: { product: MarketplaceProduct }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const price = toRupiah(product.price);
  const discount = product.discountPrice ? toRupiah(product.discountPrice) : 0;
  // Backend menolak harga diskon yang tidak lebih kecil; penjagaan di sini
  // supaya data lama yang terbalik tampil sebagai harga biasa, bukan sebagai
  // "diskon -0%".
  const hasDiscount = discount > 0 && discount < price;
  const percent = hasDiscount ? Math.round(((price - discount) / price) * 100) : 0;
  const outOfStock = product.stock <= 0;

  const isUmkm = product.sellerType === 'UMKM';
  const href = isUmkm ? `/umkm-product/${product.id}` : `/product/${product.id}`;

  async function addToCart() {
    // Ketukan ganda saat permintaan berjalan tidak boleh mengirim dua kali.
    if (adding || outOfStock) return;
    setAdding(true);
    try {
      await api.addToCart(
        isUmkm ? { umkmProductId: product.id } : { productId: product.id },
        1,
      );
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      // Gagal menambah tidak mengubah kartu; pengguna bisa mencoba lagi.
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className="kc-product">
      <Link href={href} className="kc-product__media" aria-label={product.name}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" loading="lazy" />
        ) : (
          <Package size={30} aria-hidden="true" style={{ color: 'var(--muted-soft)' }} />
        )}
        {hasDiscount && <span className="kc-product__disc">-{percent}%</span>}
        <span className="kc-product__tag">
          <SellerBadge kind={product.sellerType} />
        </span>
      </Link>

      <div className="kc-product__body">
        <Link href={href} className="kc-product__name">
          {product.name}
        </Link>
        <p className="kc-product__seller">{product.sellerName}</p>

        {/* Rata-rata null berarti belum ada ulasan — bukan nol bintang,
            jadi barisnya tidak digambar sama sekali. */}
        {product.rating.average != null && (
          <p className="kc-product__seller">
            <Star
              size={12}
              aria-hidden="true"
              style={{ color: 'var(--yellow-accent)', fill: 'currentColor' }}
            />{' '}
            {product.rating.average.toFixed(1)}
            {product.rating.count ? ` (${product.rating.count})` : ''}
          </p>
        )}

        {/* Stok habis ditulis, bukan hanya diberi warna — warna saja tidak
            terbaca pengguna yang buta warna. */}
        {outOfStock && <Badge variant="muted">Stok habis</Badge>}

        <div className="kc-product__foot">
          <div>
            <p className="kc-product__price">
              {formatRupiah(hasDiscount ? discount : price)}
            </p>
            {hasDiscount && (
              <p className="kc-product__strike">
                <span className="visually-hidden">Harga sebelum diskon </span>
                {formatRupiah(price)}
              </p>
            )}
          </div>
          <button
            type="button"
            className="kc-addbtn"
            onClick={() => void addToCart()}
            disabled={adding || outOfStock}
            aria-label={
              outOfStock
                ? `${product.name} stok habis`
                : `Tambah ${product.name} ke keranjang`
            }
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
        <span role="status" className="visually-hidden">
          {added ? `${product.name} ditambahkan ke keranjang` : ''}
        </span>
      </div>
    </article>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import {
  Badge,
  Button,
  Card,
  Message,
  QuantityStepper,
  SectionHeader,
  SellerBadge,
  Skeleton,
  type SellerKind,
} from '@shared/design/ui';
import { formatDate, formatRupiah, toRupiah } from '@shared/format';
import type { Review } from '@shared/api';

/**
 * Detail produk — padanan `ProductDetailScreen` pada aplikasi Flutter.
 *
 * Dipakai untuk produk Kopdes maupun produk Mitra UMKM: keduanya punya bentuk
 * data yang sama di layar, yang berbeda hanya endpoint dan lencana penjualnya.
 */

export interface ProductDetailData {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number | null;
  stock: number;
  unit?: string;
  sku?: string | null;
  isPreOrderAllowed?: boolean;
  preOrderAvailableAt?: string | null;
  images: string[];
  sellerKind: SellerKind;
  sellerName: string;
  categoryName?: string | null;
}

export function ProductDetail({
  product,
  reviewRef,
}: {
  product: ProductDetailData;
  /** Sasaran ulasan; bentuknya berbeda antara produk Kopdes dan UMKM. */
  reviewRef: { productId?: string; umkmProductId?: string };
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  const price = toRupiah(product.price);
  const discount = product.discountPrice ? toRupiah(product.discountPrice) : 0;
  const hasDiscount = discount > 0 && discount < price;
  const unitPrice = hasDiscount ? discount : price;

  const outOfStock = product.stock <= 0;
  // Stok habis tidak selalu berarti tidak bisa dipesan: produk yang membuka
  // pre-order tetap boleh dibeli, dan backend yang memutuskan itu.
  const canOrder = !outOfStock || !!product.isPreOrderAllowed;

  async function addToCart() {
    if (!getToken()) {
      router.push(`/login?next=/product/${product.id}`);
      return;
    }
    setAdding(true);
    setNotice(null);
    try {
      await api.addToCart(product.id, quantity);
      setNotice('Produk masuk ke keranjang.');
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="kc-split">
      <div className="stack-lg">
        <Card pad={false}>
          <div
            className="kc-product__media"
            style={{ borderRadius: 'var(--r-card) var(--r-card) 0 0' }}
          >
            {product.images[activeImage] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.images[activeImage]}
                alt={product.name}
                // Gambar gagal muat tidak boleh menjatuhkan halaman; kotak
                // abu-abunya sudah menjadi keadaan bawaan.
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span aria-hidden="true" style={{ fontSize: 40 }}>
                📦
              </span>
            )}
          </div>

          {product.images.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: 'var(--sp-sm)',
                padding: 'var(--sp-md)',
                overflowX: 'auto',
              }}
            >
              {product.images.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Gambar ${i + 1} dari ${product.images.length}`}
                  aria-current={i === activeImage}
                  style={{
                    width: 56,
                    height: 56,
                    flex: 'none',
                    borderRadius: 'var(--r-sm)',
                    overflow: 'hidden',
                    border:
                      i === activeImage
                        ? '2px solid var(--primary)'
                        : '1px solid var(--hairline)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="stack-md">
          <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
            <SellerBadge kind={product.sellerKind} />
            {product.categoryName && (
              <Badge variant="muted">{product.categoryName}</Badge>
            )}
            {outOfStock ? (
              <Badge variant="muted">Stok habis</Badge>
            ) : product.stock <= 5 ? (
              <Badge variant="warning">Stok tinggal {product.stock}</Badge>
            ) : (
              <Badge variant="success">Stok {product.stock} tersedia</Badge>
            )}
            {product.isPreOrderAllowed && (
              <Badge variant="primary">Pre-Order</Badge>
            )}
          </div>

          <h1 className="t-title-lg" style={{ fontWeight: 700 }}>
            {product.name}
          </h1>

          <p className="t-caption">{product.sellerName}</p>

          <div
            style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-sm)' }}
          >
            <span
              style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}
            >
              {formatRupiah(unitPrice)}
            </span>
            {product.unit && (
              <span className="t-caption-sm">/ {product.unit}</span>
            )}
            {hasDiscount && (
              <span className="kc-product__strike" style={{ fontSize: 14 }}>
                {formatRupiah(price)}
              </span>
            )}
          </div>

          {product.sku && (
            <p className="t-caption-sm">SKU {product.sku}</p>
          )}

          {product.isPreOrderAllowed && product.preOrderAvailableAt && (
            <p className="t-caption">
              Perkiraan tersedia {formatDate(product.preOrderAvailableAt)}
            </p>
          )}
        </Card>

        <Card className="stack-sm">
          <SectionHeader title="Deskripsi" />
          <p className="t-body-md" style={{ whiteSpace: 'pre-wrap' }}>
            {product.description || 'Belum ada deskripsi untuk produk ini.'}
          </p>
        </Card>

        <ReviewList reviewRef={reviewRef} />
      </div>

      <aside className="kc-split__aside">
        <Card className="stack-md">
          <SectionHeader title="Beli Produk" />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--sp-md)',
              flexWrap: 'wrap',
            }}
          >
            <span className="t-caption">Jumlah</span>
            <QuantityStepper
              value={quantity}
              // Pre-order boleh melewati stok; tanpa itu stepper akan mati
              // pada produk yang justru sengaja dijual sebelum barang ada.
              stock={product.isPreOrderAllowed ? 999 : product.stock}
              productName={product.name}
              onChange={setQuantity}
            />
          </div>

          <div
            style={{
              borderTop: '1px solid var(--hairline-soft)',
              paddingTop: 'var(--sp-sm)',
            }}
          >
            <div className="kc-line kc-line--total">
              <span className="kc-line__label">Subtotal</span>
              <span className="kc-line__value">
                {formatRupiah(unitPrice * quantity)}
              </span>
            </div>
          </div>

          <Button block disabled={!canOrder || adding} onClick={addToCart}>
            {adding
              ? 'Menambahkan…'
              : canOrder
                ? 'Tambah ke Keranjang'
                : 'Stok Habis'}
          </Button>

          {notice && <p className="t-caption">{notice}</p>}

          <p className="t-caption-sm">
            Ongkir dan potongan ditentukan koperasi saat pesanan dibuat.
          </p>
        </Card>
      </aside>
    </div>
  );
}

/** Daftar ulasan produk. */
function ReviewList({
  reviewRef,
}: {
  reviewRef: { productId?: string; umkmProductId?: string };
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getReviews(reviewRef, 1, 5)
      .then((res) => {
        if (cancelled) return;
        setReviews(res.items);
        setAverage(res.averageRating);
        setTotal(res.meta.total);
      })
      // Ulasan gagal dimuat bukan alasan menutup detail produk.
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reviewRef.productId, reviewRef.umkmProductId]);

  return (
    <Card className="stack-md">
      <SectionHeader
        title={
          // Rata-rata null berarti belum ada ulasan — bukan nol bintang.
          average != null ? `Ulasan ★ ${average} (${total})` : 'Ulasan'
        }
      />

      {loading && (
        <div className="stack-sm">
          <Skeleton height={14} width="40%" />
          <Skeleton height={14} />
        </div>
      )}

      {!loading && reviews.length === 0 && (
        <Message
          title="Belum ada ulasan"
          body="Ulasan muncul setelah pembeli menerima pesanannya."
        />
      )}

      {!loading &&
        reviews.map((review) => (
          <div
            key={review.id}
            style={{
              borderTop: '1px solid var(--hairline-soft)',
              paddingTop: 'var(--sp-sm)',
            }}
          >
            <div
              style={{ display: 'flex', gap: 'var(--sp-sm)', alignItems: 'baseline' }}
            >
              <strong style={{ fontSize: 13.5, color: 'var(--ink)' }}>
                {review.user?.name ?? 'Pembeli'}
              </strong>
              <span style={{ color: 'var(--yellow-accent)' }}>
                {'★'.repeat(review.rating)}
                <span style={{ color: 'var(--hairline)' }}>
                  {'★'.repeat(5 - review.rating)}
                </span>
              </span>
              <span className="t-caption-sm" style={{ marginLeft: 'auto' }}>
                {formatDate(review.createdAt)}
              </span>
            </div>
            {review.comment && (
              <p className="t-body-md" style={{ marginTop: 4 }}>
                {review.comment}
              </p>
            )}
          </div>
        ))}
    </Card>
  );
}

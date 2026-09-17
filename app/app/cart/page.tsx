'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { Cart, CartItem } from '@shared/api';

function rupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

// Normalisasi item (produk koperasi atau UMKM) ke bentuk seragam.
function lineOf(item: CartItem) {
  const p = item.product ?? item.umkmProduct;
  const ref = item.product
    ? { productId: item.product.id }
    : { umkmProductId: item.umkmProduct!.id };
  return {
    name: p?.name ?? 'Produk',
    price: Number(p?.price ?? 0),
    image: p?.images?.find((i) => i.isPrimary)?.url ?? p?.images?.[0]?.url,
    ref,
  };
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCart(await api.getCart());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    load();
  }, [router, load]);

  async function changeQty(item: CartItem, next: number) {
    if (next < 1 || busy) return;
    setBusy(true);
    try {
      setCart(await api.updateCartItem(lineOf(item).ref, next));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: CartItem) {
    setBusy(true);
    try {
      setCart(await api.removeCartItem(lineOf(item).ref));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="state">Memuat keranjang…</div>;

  const items = cart?.items ?? [];
  const subtotal = items.reduce(
    (sum, it) => sum + lineOf(it).price * it.quantity,
    0,
  );

  return (
    <>
      <h1 className="page-title">Keranjang</h1>
      <p className="page-sub">Tinjau belanjaan sebelum checkout.</p>

      {error && <div className="error">{error}</div>}

      {items.length === 0 ? (
        <div className="empty">
          Keranjang masih kosong.
          <br />
          <Link href="/" className="muted">
            ← Belanja sekarang
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => {
              const l = lineOf(item);
              return (
                <div className="cart-row" key={item.id}>
                  <div className="cart-thumb">
                    {l.image ? <img src={l.image} alt={l.name} /> : '📦'}
                  </div>
                  <div className="cart-meta">
                    <div className="name">{l.name}</div>
                    <div className="price">{rupiah(l.price)}</div>
                  </div>
                  <div className="qty">
                    <button
                      onClick={() => changeQty(item, item.quantity - 1)}
                      disabled={busy || item.quantity <= 1}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => changeQty(item, item.quantity + 1)}
                      disabled={busy}
                    >
                      +
                    </button>
                  </div>
                  <div className="cart-line">{rupiah(l.price * item.quantity)}</div>
                  <button
                    className="remove"
                    onClick={() => remove(item)}
                    disabled={busy}
                    aria-label="Hapus"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <aside className="cart-summary">
            <h3>Ringkasan</h3>
            <div className="sum-row">
              <span>Subtotal ({items.length} item)</span>
              <span>{rupiah(subtotal)}</span>
            </div>
            <div className="sum-total">
              <span>Total</span>
              <span>{rupiah(subtotal)}</span>
            </div>
            <button
              className="btn"
              onClick={() => router.push('/checkout')}
              disabled={busy}
            >
              Lanjut ke Checkout
            </button>
          </aside>
        </div>
      )}
    </>
  );
}

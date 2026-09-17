'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { Cart, CartItem, Order, PaymentMethod } from '@shared/api';

// Sama seperti aplikasi mobile: alamat default yang disiapkan via seed.
const DELIVERY_ADDRESS_ID = 'default-mock-address-id';

function rupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n);
}

function priceOf(item: CartItem) {
  const p = item.product ?? item.umkmProduct;
  return Number(p?.price ?? 0) * item.quantity;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>('QRIS');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api
      .getCart()
      .then(setCart)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [router]);

  async function placeOrder() {
    setError(null);
    setPlacing(true);
    try {
      const result = await api.checkout(DELIVERY_ADDRESS_ID, payment);
      setOrder(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPlacing(false);
    }
  }

  if (loading) return <div className="state">Memuat…</div>;

  // Konfirmasi pesanan berhasil.
  if (order) {
    return (
      <div className="card">
        <div style={{ fontSize: 48, textAlign: 'center' }}>✅</div>
        <h1 style={{ textAlign: 'center' }}>Pesanan Berhasil</h1>
        <p className="muted" style={{ textAlign: 'center' }}>
          No. Pesanan #{order.id.slice(0, 8).toUpperCase()}
        </p>
        <div className="sum-total" style={{ marginTop: 16 }}>
          <span>Total</span>
          <span>{rupiah(Number(order.totalAmount))}</span>
        </div>
        <p className="muted" style={{ margin: '12px 0' }}>
          Metode bayar: {order.paymentMethod}
        </p>
        <Link href="/orders" className="btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
          Lihat Pesanan Saya
        </Link>
        <Link href="/" className="muted" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
          Kembali ke marketplace
        </Link>
      </div>
    );
  }

  const items = cart?.items ?? [];
  const total = items.reduce((s, it) => s + priceOf(it), 0);

  if (items.length === 0) {
    return (
      <div className="empty">
        Keranjang kosong, tidak ada yang bisa di-checkout.
        <br />
        <Link href="/" className="muted">
          ← Belanja dulu
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="page-title">Checkout</h1>
      <p className="page-sub">Konfirmasi alamat, pembayaran, dan pesanan Anda.</p>

      {error && <div className="error">{error}</div>}

      <div className="cart-layout">
        <div className="cart-items">
          {/* Alamat */}
          <section className="co-section">
            <h3>Alamat Pengiriman</h3>
            <div className="co-address">
              <div className="ic">📍</div>
              <div>
                <strong>Alamat Utama</strong>
                <div className="muted">
                  Alamat tersimpan pengguna (disiapkan via seed).
                </div>
              </div>
            </div>
          </section>

          {/* Pembayaran */}
          <section className="co-section">
            <h3>Metode Pembayaran</h3>
            {(['QRIS', 'COD'] as PaymentMethod[]).map((m) => (
              <label
                key={m}
                className={`co-pay ${payment === m ? 'on' : ''}`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={m}
                  checked={payment === m}
                  onChange={() => setPayment(m)}
                />
                <span>
                  {m === 'QRIS'
                    ? 'QRIS (Pembayaran Instan)'
                    : 'COD (Bayar di Tempat)'}
                </span>
              </label>
            ))}
          </section>

          {/* Ringkasan item */}
          <section className="co-section">
            <h3>Item</h3>
            {items.map((it) => {
              const p = it.product ?? it.umkmProduct;
              return (
                <div className="co-item" key={it.id}>
                  <span>
                    {p?.name} × {it.quantity}
                  </span>
                  <span>{rupiah(priceOf(it))}</span>
                </div>
              );
            })}
          </section>
        </div>

        <aside className="cart-summary">
          <h3>Ringkasan</h3>
          <div className="sum-row">
            <span>Subtotal</span>
            <span>{rupiah(total)}</span>
          </div>
          <div className="sum-row">
            <span>Ongkir</span>
            <span>—</span>
          </div>
          <div className="sum-total">
            <span>Total</span>
            <span>{rupiah(total)}</span>
          </div>
          <button className="btn" onClick={placeOrder} disabled={placing}>
            {placing ? 'Memproses…' : 'Buat Pesanan'}
          </button>
        </aside>
      </div>
    </>
  );
}

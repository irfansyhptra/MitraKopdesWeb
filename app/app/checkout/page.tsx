'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import {
  Button,
  Card,
  Message,
  MoneyLine,
  SectionHeader,
  Skeleton,
} from '@shared/design/ui';
import { Package } from '@shared/design/icons';
import { formatRupiah, shippingLabel, toRupiah } from '@shared/format';
import type { Address, Cart, PaymentMethod } from '@shared/api';

/**
 * Checkout — padanan `CheckoutScreen` pada aplikasi Flutter.
 *
 * Nominal tidak pernah ditambahi di klien. Versi Flutter pernah menambahkan
 * ongkir Rp10.000 dan biaya layanan Rp2.000 sendiri, sehingga total yang
 * dilihat pemesan Rp12.000 lebih besar daripada yang benar-benar ditagihkan.
 * Di sini yang ditampilkan hanya komponen yang memang dihitung backend.
 */

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutForm />
    </Suspense>
  );
}

function CheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Baris yang dicentang di halaman Pesanan; kosong berarti seluruh keranjang.
  const selectedIds = useMemo(() => {
    const raw = searchParams?.get('items');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>('');
  const [payment, setPayment] = useState<PaymentMethod>('QRIS');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cartData, addressList] = await Promise.all([
        api.getCart(),
        // Alamat gagal dimuat tidak menutup checkout: backend akan memakai
        // alamat utama profil bila `deliveryAddressId` tidak dikirim.
        api.getAddresses().catch(() => [] as Address[]),
      ]);
      setCart(cartData);
      setAddresses(addressList);
      const preferred =
        addressList.find((a) => a.isDefault) ?? addressList[0];
      if (preferred) setAddressId(preferred.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/checkout');
      return;
    }
    void load();
  }, [load, router]);

  const lines = useMemo(() => {
    const items = cart?.items ?? [];
    if (selectedIds.length === 0) return items;
    const wanted = new Set(selectedIds);
    return items.filter((i) => wanted.has(i.id));
  }, [cart, selectedIds]);

  const subtotal = useMemo(
    () =>
      lines.reduce((sum, item) => {
        const source = item.product ?? item.umkmProduct;
        return sum + toRupiah(source?.price) * item.quantity;
      }, 0),
    [lines],
  );

  // Ongkir dan diskon nol karena backend belum membebankan keduanya
  // (`resolveShippingFee` di order-money.ts). Keduanya sudah menjadi bagian
  // rumus supaya cukup diisi begitu tarifnya diputuskan pengurus.
  const shippingFee = 0;
  const discount = 0;
  const total = subtotal + shippingFee - discount;

  async function submit() {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.checkout({
        paymentMethod: payment,
        ...(addressId ? { deliveryAddressId: addressId } : {}),
        ...(selectedIds.length > 0 ? { cartItemIds: selectedIds } : {}),
      });
      router.replace(`/order-success/${order.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="stack-md">
        <Skeleton height={28} width="40%" />
        <Card className="stack-sm">
          <Skeleton height={16} width="30%" />
          <Skeleton height={56} />
        </Card>
        <Card className="stack-sm">
          <Skeleton height={16} width="30%" />
          <Skeleton height={80} />
        </Card>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <Message
        title="Tidak ada produk untuk dibayar"
        body="Pilih produk di keranjang lebih dulu."
        actionLabel="Buka Keranjang"
        href="/orders"
      />
    );
  }

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Checkout</h1>
          <p className="page-sub">
            Periksa pesananmu sebelum dibayar
          </p>
        </div>
      </div>

      <div className="kc-split">
        <div className="stack-md">
          <Card className="stack-md">
            <SectionHeader title="Alamat Pengiriman" />
            {addresses.length === 0 ? (
              <p className="t-caption">
                Belum ada alamat tersimpan. Koperasi akan memakai alamat utama
                pada profilmu.
              </p>
            ) : (
              <div className="stack-sm">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    style={{
                      display: 'flex',
                      gap: 'var(--sp-md)',
                      alignItems: 'flex-start',
                      padding: 'var(--sp-md)',
                      border: `1px solid ${
                        addressId === address.id
                          ? 'var(--primary)'
                          : 'var(--hairline)'
                      }`,
                      borderRadius: 'var(--r-button)',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={addressId === address.id}
                      onChange={() => setAddressId(address.id)}
                      style={{ marginTop: 3, accentColor: 'var(--primary)' }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: 13.5, color: 'var(--ink)' }}>
                        {address.title} · {address.recipientName}
                      </strong>
                      <span
                        className="t-caption-sm"
                        style={{ display: 'block', marginTop: 2 }}
                      >
                        {address.phone}
                        <br />
                        {address.street}, {address.city}, {address.state}{' '}
                        {address.postalCode}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </Card>

          <Card className="stack-md">
            <SectionHeader title="Metode Pembayaran" />
            <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
              {(['QRIS', 'COD'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  className="kc-chip"
                  aria-selected={payment === method}
                  onClick={() => setPayment(method)}
                >
                  {method === 'QRIS' ? 'QRIS' : 'Bayar di Tempat (COD)'}
                </button>
              ))}
            </div>
          </Card>

          <Card pad={false}>
            <div style={{ padding: 'var(--sp-base) var(--sp-base) 0' }}>
              <SectionHeader title={`Produk (${lines.length})`} />
            </div>
            {lines.map((item) => {
              const source = item.product ?? item.umkmProduct;
              const images = source?.images ?? [];
              const url = (images.find((i) => i.isPrimary) ?? images[0])?.url;
              return (
                <div className="cartrow" key={item.id}>
                  <div className="cartrow__thumb">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={source?.name ?? 'Produk'} />
                    ) : (
                      <Package size={24} aria-hidden="true" style={{ color: 'var(--muted-soft)' }} />
                    )}
                  </div>
                  <div className="cartrow__body">
                    <p className="cartrow__name">{source?.name ?? 'Produk'}</p>
                    <p className="t-caption-sm">
                      {item.quantity} × {formatRupiah(toRupiah(source?.price))}
                    </p>
                    <span className="cartrow__price">
                      {formatRupiah(toRupiah(source?.price) * item.quantity)}
                    </span>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>

        <aside className="kc-split__aside">
          <Card className="stack-md">
            <SectionHeader title="Rincian Pembayaran" />
            <div className="stack-sm">
              <MoneyLine
                label={`Subtotal (${lines.length} produk)`}
                value={formatRupiah(subtotal)}
              />
              <MoneyLine label="Ongkos Kirim" value={shippingLabel(shippingFee)} />
              {discount > 0 && (
                <MoneyLine
                  label="Diskon"
                  value={`-${formatRupiah(discount)}`}
                  accent="success"
                />
              )}
              <div
                style={{
                  borderTop: '1px solid var(--hairline-soft)',
                  paddingTop: 'var(--sp-sm)',
                }}
              >
                <MoneyLine
                  label="Total Pembayaran"
                  value={formatRupiah(total)}
                  total
                />
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}

            <Button block disabled={submitting} onClick={() => void submit()}>
              {submitting ? 'Memproses…' : 'Buat Pesanan'}
            </Button>

            <p className="t-caption-sm">
              Ongkir dan potongan ditentukan koperasi saat pesanan dibuat.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}

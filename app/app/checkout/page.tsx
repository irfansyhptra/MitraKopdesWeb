'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import {
  Button,
  Card,
  Message,
  MoneyLine,
  SectionHeader,
  SellerBadge,
  Skeleton,
} from '@shared/design/ui';
import { formatRupiah, shippingLabel, toRupiah } from '@shared/format';
import { MapPin, Package } from '@shared/design/icons';
import { groupBySeller } from '@/components/CartTab';
import { MethodPicker } from '@/components/payment/MethodPicker';
import { rememberMethod } from '@/components/payment/methods';
import type { Address, Cart, PaymentMethodCode } from '@shared/api';

/**
 * Checkout.
 *
 * Nominal yang tampil di sini adalah tampilan, bukan kebenaran: backend
 * menghitung ulang seluruhnya dari database saat pesanan dibuat dan saat
 * transaksi pembayaran dibuat. Versi Flutter pernah menambahkan ongkir
 * Rp10.000 dan biaya layanan Rp2.000 sendiri, sehingga total yang dilihat
 * pemesan Rp12.000 lebih besar daripada yang benar-benar ditagihkan.
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

  const selectedIds = useMemo(() => {
    const raw = searchParams?.get('items');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethodCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<'idle' | 'order' | 'payment'>('idle');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cartData, addressList] = await Promise.all([
        api.getCart(),
        api.getAddresses().catch(() => [] as Address[]),
      ]);
      setCart(cartData);
      setAddresses(addressList);
      const preferred = addressList.find((a) => a.isDefault) ?? addressList[0];
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

  const groups = useMemo(
    () => groupBySeller(lines.length ? { id: 'x', items: lines } : null),
    [lines],
  );

  const subtotal = useMemo(
    () =>
      lines.reduce((sum, item) => {
        const source = item.product ?? item.umkmProduct;
        return sum + toRupiah(source?.price) * item.quantity;
      }, 0),
    [lines],
  );

  // Ongkir, biaya layanan, dan diskon nol karena backend belum membebankan
  // ketiganya (`resolveShippingFee` di order-money.ts). Barisnya tetap ada
  // supaya tinggal terisi begitu tarifnya diputuskan pengurus — dan supaya
  // tidak ada yang tergoda menambahkannya di klien.
  const shippingFee = 0;
  const serviceFee = 0;
  const discount = 0;
  const total = subtotal + shippingFee + serviceFee - discount;

  const selectedAddress = addresses.find((a) => a.id === addressId);

  /**
   * Membuat pesanan lalu transaksi pembayarannya.
   *
   * Dua langkah, dan tahapnya ditampilkan: pembuatan pesanan cepat,
   * pembuatan transaksi menyentuh gateway dan bisa memakan beberapa detik.
   * Satu label diam membuat pemesan menekan tombolnya lagi.
   */
  async function submit() {
    if (lines.length === 0 || !method || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      setStage('order');
      const order = await api.checkout({
        paymentMethod: 'QRIS',
        ...(addressId ? { deliveryAddressId: addressId } : {}),
        ...(selectedIds.length > 0 ? { cartItemIds: selectedIds } : {}),
      });

      setStage('payment');
      await api.createPayment(order.id, method);
      rememberMethod(method);

      router.replace(`/payment/${order.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
      setStage('idle');
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
          <Skeleton height={140} />
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
          <p className="page-sub">Periksa pesananmu sebelum dibayar</p>
        </div>
      </div>

      <div className="kc-split">
        <div className="stack-md">
          <Card className="stack-md">
            <SectionHeader
              title="Alamat Pengiriman"
              actionLabel="Ubah"
              href="/profile/alamat"
            />
            {selectedAddress ? (
              <div style={{ display: 'flex', gap: 'var(--sp-md)' }}>
                <MapPin size={16} aria-hidden="true" style={{ color: 'var(--primary)', flex: 'none', marginTop: 2 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                    {selectedAddress.title} · {selectedAddress.recipientName}
                  </p>
                  <p className="t-caption-sm">{selectedAddress.phone}</p>
                  <p className="t-caption-sm">
                    {selectedAddress.street}, {selectedAddress.city},{' '}
                    {selectedAddress.state} {selectedAddress.postalCode}
                  </p>
                </div>
              </div>
            ) : (
              <p className="t-caption">
                Belum ada alamat tersimpan. Koperasi akan memakai alamat utama
                pada profilmu.{' '}
                <Link href="/profile/alamat" className="kc-section-head__action">
                  Tambah alamat
                </Link>
              </p>
            )}

            {addresses.length > 1 && (
              <div className="field">
                <label htmlFor="address-pick">Pilih alamat lain</label>
                <select
                  id="address-pick"
                  value={addressId}
                  onChange={(e) => setAddressId(e.target.value)}
                >
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} — {a.recipientName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </Card>

          {/* Dipisah per penjual: barang Kopdes dan barang mitra ditangani
              pihak yang berbeda, dan pemesan perlu tahu dari siapa
              barangnya datang sebelum membayar. */}
          {groups.map((group) => (
            <div className="kc-sellergroup" key={group.key}>
              <div className="kc-sellergroup__head">
                <SellerBadge kind={group.kind} />
                <span>{group.name}</span>
                <span className="t-caption-sm" style={{ marginLeft: 'auto' }}>
                  {group.items.length} produk
                </span>
              </div>
              {group.items.map((item) => {
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
                        <Package size={22} aria-hidden="true" style={{ color: 'var(--muted-soft)' }} />
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
            </div>
          ))}

          <Card className="stack-md">
            <SectionHeader title="Metode Pembayaran" />
            <MethodPicker value={method} onChange={setMethod} amount={total} />
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
              <MoneyLine
                label="Biaya Layanan"
                value={serviceFee > 0 ? formatRupiah(serviceFee) : 'Gratis'}
              />
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

            <Button
              block
              disabled={submitting || !method}
              onClick={() => void submit()}
            >
              {stage === 'order'
                ? 'Membuat pesanan…'
                : stage === 'payment'
                  ? 'Menyiapkan pembayaran…'
                  : method
                    ? 'Bayar Sekarang'
                    : 'Pilih metode pembayaran'}
            </Button>

            <p className="t-caption-sm">
              Nominal akhir dihitung ulang koperasi saat pesanan dibuat.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}

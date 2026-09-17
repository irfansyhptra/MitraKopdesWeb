'use client';

import { useState } from 'react';
import { Button, Card, MoneyLine } from '@shared/design/ui';
import { formatRupiah, shippingLabel } from '@shared/format';

/**
 * Ringkasan Belanja — padanan `ShoppingSummaryCard` pada aplikasi Flutter.
 *
 * Total dihitung dari data keranjang dan pilihan pengguna, tidak pernah dari
 * angka tetap. Ongkir dan diskon nol karena backend memang belum
 * membebankan keduanya (lihat `resolveShippingFee` di `order-money.ts`);
 * keduanya sudah menjadi bagian rumus supaya cukup diisi begitu tarifnya ada.
 */
export function ShoppingSummary({
  subtotal,
  shippingFee = 0,
  discount = 0,
  selectedLines,
  totalLines,
  allSelected,
  onToggleAll,
  onCheckout,
  busy = false,
}: {
  subtotal: number;
  shippingFee?: number;
  discount?: number;
  selectedLines: number;
  totalLines: number;
  allSelected: boolean;
  onToggleAll: (next: boolean) => void;
  onCheckout: () => void;
  busy?: boolean;
}) {
  // Pada layar pendek ringkasan terbuka penuh memakan hampir separuh
  // viewport, jadi bisa dilipat. Terlipat tetap menampilkan total dan
  // tombol checkout — dua hal yang memang dicari di tahap ini.
  const [expanded, setExpanded] = useState(true);

  const effectiveDiscount = Math.min(discount, subtotal);
  const total = subtotal + shippingFee - effectiveDiscount;
  const canCheckout = selectedLines > 0 && !busy;

  return (
    <Card className="stack-md">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          gap: 'var(--sp-sm)',
          minHeight: 32,
        }}
      >
        <span
          style={{
            flex: 1,
            textAlign: 'left',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--ink)',
          }}
        >
          Ringkasan Belanja
        </span>
        <span aria-hidden="true">{expanded ? '⌄' : '⌃'}</span>
      </button>

      {expanded && (
        <div className="stack-sm">
          <MoneyLine
            label={`Subtotal (${selectedLines} produk)`}
            value={formatRupiah(subtotal)}
          />
          <MoneyLine label="Ongkir" value={shippingLabel(shippingFee)} />
          {/* Baris diskon hanya muncul kalau memang ada potongannya:
              "-Rp0" terbaca sebagai promo yang gagal dipakai. */}
          {effectiveDiscount > 0 && (
            <MoneyLine
              label="Diskon"
              value={`-${formatRupiah(effectiveDiscount)}`}
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
      )}

      {!expanded && (
        <MoneyLine label="Total Pembayaran" value={formatRupiah(total)} total />
      )}

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-sm)',
          fontSize: 13.5,
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => onToggleAll(e.target.checked)}
          style={{ width: 20, height: 20, accentColor: 'var(--primary)' }}
        />
        Pilih Semua ({totalLines} produk)
      </label>

      <Button block disabled={!canCheckout} onClick={onCheckout}>
        {busy ? 'Memproses…' : `Checkout (${selectedLines})`}
      </Button>
    </Card>
  );
}

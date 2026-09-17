import { describe, expect, it } from 'vitest';
import {
  formatRupiah,
  orderTotal,
  shippingLabel,
  toRupiah,
} from '@shared/format';

/**
 * Jalur uang. Backend mengirim `Decimal` sebagai string justru supaya
 * nilainya tidak melewati floating point — tes ini menjaga agar sisi web
 * tidak diam-diam membuang jaminan itu.
 */

describe('toRupiah', () => {
  it('membaca Decimal yang dikirim sebagai string', () => {
    expect(toRupiah('116000.00')).toBe(116000);
    expect(toRupiah('15500.50')).toBe(15501);
  });

  it('memperlakukan nilai kosong sebagai nol, bukan NaN', () => {
    // NaN yang lolos ke sini akan tampil sebagai "RpNaN" di rincian
    // pembayaran, bukan gagal dengan jelas.
    expect(toRupiah(null)).toBe(0);
    expect(toRupiah(undefined)).toBe(0);
    expect(toRupiah('')).toBe(0);
    expect(toRupiah('bukan angka')).toBe(0);
  });

  it('menerima angka apa adanya', () => {
    expect(toRupiah(64000)).toBe(64000);
  });
});

describe('formatRupiah', () => {
  it('menyisipkan titik tiap tiga digit', () => {
    expect(formatRupiah(3450000)).toBe('Rp3.450.000');
    expect(formatRupiah(64000)).toBe('Rp64.000');
    expect(formatRupiah(500)).toBe('Rp500');
  });

  it('tidak menaruh titik di depan angka ribuan bulat', () => {
    // Bug klasik pemisah ribuan: "Rp.100.000".
    expect(formatRupiah(100000)).toBe('Rp100.000');
    expect(formatRupiah(1000)).toBe('Rp1.000');
  });

  it('menaruh tanda minus sebelum "Rp"', () => {
    expect(formatRupiah(-25000)).toBe('-Rp25.000');
  });

  it('nol tetap ditulis', () => {
    expect(formatRupiah(0)).toBe('Rp0');
  });
});

describe('orderTotal', () => {
  it('menjumlahkan subtotal dan ongkir lalu memotong diskon', () => {
    expect(
      orderTotal({ subtotal: 100000, shippingFee: 10000, discountAmount: 5000 }),
    ).toBe(105000);
  });

  it('diskon tidak boleh melebihi nilai barang', () => {
    // Total negatif berarti koperasi membayar pembeli, dan tidak ada jalur
    // pengembalian uang untuk itu.
    expect(
      orderTotal({ subtotal: 20000, shippingFee: 0, discountAmount: 50000 }),
    ).toBe(0);
  });

  it('ongkir tetap ditagih meski barang habis didiskon', () => {
    expect(
      orderTotal({ subtotal: 20000, shippingFee: 8000, discountAmount: 20000 }),
    ).toBe(8000);
  });
});

describe('shippingLabel', () => {
  it('menulis ongkir nol sebagai kata', () => {
    expect(shippingLabel(0)).toBe('Gratis');
  });

  it('menulis ongkir berbayar sebagai nominal', () => {
    expect(shippingLabel(10000)).toBe('Rp10.000');
  });
});

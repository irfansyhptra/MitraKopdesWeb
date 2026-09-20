'use client';

import { Card } from '@shared/design/ui';
import { formatRupiah } from '@shared/format';
import { CopyRow } from './PaymentBits';
import { methodInfo } from './methods';
import type { PaymentSnapshot } from '@shared/api';

/**
 * Instruksi Virtual Account.
 *
 * Tiga kanal ditulis lengkap — ATM, mobile banking, internet banking — karena
 * pengurus dan warga desa memakai ketiganya, dan menyuruh "ikuti petunjuk
 * bank" pada layar pembayaran adalah cara paling mudah kehilangan transaksi.
 */

const CHANNEL_STEPS: Record<string, { atm: string[]; mobile: string[]; internet: string[] }> = {
  bca: {
    atm: [
      'Masukkan kartu dan PIN.',
      'Pilih Transaksi Lainnya → Transfer → ke Rekening BCA Virtual Account.',
      'Masukkan nomor Virtual Account di atas.',
      'Periksa nama dan nominalnya, lalu konfirmasi.',
    ],
    mobile: [
      'Buka m-BCA, pilih m-Transfer → BCA Virtual Account.',
      'Masukkan nomor Virtual Account di atas.',
      'Periksa rinciannya, lalu masukkan PIN m-BCA.',
    ],
    internet: [
      'Masuk ke KlikBCA, pilih Transfer Dana → Transfer ke BCA Virtual Account.',
      'Masukkan nomor Virtual Account di atas.',
      'Konfirmasi dengan KeyBCA.',
    ],
  },
  bni: {
    atm: [
      'Masukkan kartu dan PIN.',
      'Pilih Menu Lainnya → Transfer → Rekening Tabungan → Ke Rekening BNI.',
      'Masukkan nomor Virtual Account di atas sebagai rekening tujuan.',
      'Periksa rinciannya, lalu konfirmasi.',
    ],
    mobile: [
      'Buka BNI Mobile Banking, pilih Transfer → Virtual Account Billing.',
      'Masukkan nomor Virtual Account di atas.',
      'Konfirmasi dengan password transaksi.',
    ],
    internet: [
      'Masuk ke BNI Internet Banking, pilih Transfer → Virtual Account Billing.',
      'Masukkan nomor Virtual Account di atas.',
      'Konfirmasi dengan BNI e-Secure.',
    ],
  },
  bri: {
    atm: [
      'Masukkan kartu dan PIN.',
      'Pilih Transaksi Lain → Pembayaran → Lainnya → BRIVA.',
      'Masukkan nomor Virtual Account di atas.',
      'Periksa rinciannya, lalu konfirmasi.',
    ],
    mobile: [
      'Buka BRImo, pilih Pembayaran → BRIVA.',
      'Masukkan nomor Virtual Account di atas.',
      'Konfirmasi dengan PIN BRImo.',
    ],
    internet: [
      'Masuk ke Internet Banking BRI, pilih Pembayaran → BRIVA.',
      'Masukkan nomor Virtual Account di atas.',
      'Konfirmasi dengan mToken.',
    ],
  },
  permata: {
    atm: [
      'Masukkan kartu dan PIN.',
      'Pilih Transaksi Lainnya → Pembayaran → Pembayaran Lainnya → Virtual Account.',
      'Masukkan nomor Virtual Account di atas.',
      'Periksa rinciannya, lalu konfirmasi.',
    ],
    mobile: [
      'Buka PermataMobile X, pilih Pembayaran Tagihan → Virtual Account.',
      'Masukkan nomor Virtual Account di atas.',
      'Konfirmasi dengan PIN.',
    ],
    internet: [
      'Masuk ke PermataNet, pilih Pembayaran → Pembayaran Tagihan → Virtual Account.',
      'Masukkan nomor Virtual Account di atas.',
      'Konfirmasi dengan token.',
    ],
  },
};

const GENERIC = {
  atm: [
    'Masukkan kartu dan PIN.',
    'Pilih menu Pembayaran atau Transfer ke Virtual Account.',
    'Masukkan nomor Virtual Account di atas.',
    'Periksa nama dan nominalnya, lalu konfirmasi.',
  ],
  mobile: [
    'Buka aplikasi mobile banking Anda.',
    'Pilih menu Pembayaran atau Virtual Account.',
    'Masukkan nomor Virtual Account di atas, lalu konfirmasi.',
  ],
  internet: [
    'Masuk ke internet banking Anda.',
    'Pilih menu Pembayaran atau Virtual Account.',
    'Masukkan nomor Virtual Account di atas, lalu konfirmasi dengan token.',
  ],
};

export function VirtualAccountView({ payment }: { payment: PaymentSnapshot }) {
  const info = methodInfo(payment.method);
  const bank = (payment.bank ?? '').toLowerCase();
  const steps = CHANNEL_STEPS[bank] ?? GENERIC;

  // Mandiri memakai kode perusahaan + kode bayar, bukan satu nomor VA.
  const isBill = Boolean(payment.billKey && payment.billerCode);

  if (!payment.vaNumber && !isBill) {
    return (
      <Card className="stack-sm">
        <p className="t-body-md">Nomor pembayaran belum tersedia.</p>
        <p className="t-caption-sm">
          Tekan Cek Status; bila tetap kosong, buat pembayaran ulang.
        </p>
      </Card>
    );
  }

  return (
    <Card className="stack-md">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-md)' }}>
        <span
          className="kc-method__logo"
          style={{ ['--method-tint' as string]: info?.tint }}
          aria-hidden="true"
        >
          {info?.short ?? bank.toUpperCase()}
        </span>
        <div>
          <p className="kc-method__name">{info?.name ?? 'Virtual Account'}</p>
          <p className="kc-method__desc">Transfer sebelum waktunya habis.</p>
        </div>
      </div>

      {isBill ? (
        <>
          <CopyRow label="KODE PERUSAHAAN" value={payment.billerCode!} />
          <CopyRow label="KODE BAYAR" value={payment.billKey!} />
        </>
      ) : (
        <CopyRow
          label="NOMOR VIRTUAL ACCOUNT"
          value={payment.vaNumber!}
          ariaLabel="Salin nomor Virtual Account"
        />
      )}

      {/* Nominalnya bisa disalin juga: mengetik ulang angka panjang adalah
          sumber kesalahan yang tidak perlu ada. */}
      <CopyRow
        label="TOTAL YANG HARUS DIBAYAR"
        value={String(payment.grossAmount)}
        ariaLabel="Salin nominal pembayaran"
      />
      <p className="t-caption-sm" style={{ marginTop: -6 }}>
        Setara {formatRupiah(payment.grossAmount)}. Transfer harus tepat sampai
        rupiah terakhir agar terbaca otomatis.
      </p>

      <details>
        <summary className="kc-copy__label" style={{ cursor: 'pointer' }}>
          PETUNJUK LEWAT ATM
        </summary>
        <ol className="kc-steps" style={{ marginTop: 'var(--sp-sm)' }}>
          {steps.atm.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </details>

      <details>
        <summary className="kc-copy__label" style={{ cursor: 'pointer' }}>
          PETUNJUK LEWAT MOBILE BANKING
        </summary>
        <ol className="kc-steps" style={{ marginTop: 'var(--sp-sm)' }}>
          {steps.mobile.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </details>

      <details>
        <summary className="kc-copy__label" style={{ cursor: 'pointer' }}>
          PETUNJUK LEWAT INTERNET BANKING
        </summary>
        <ol className="kc-steps" style={{ marginTop: 'var(--sp-sm)' }}>
          {steps.internet.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </details>
    </Card>
  );
}

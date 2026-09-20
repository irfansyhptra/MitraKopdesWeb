'use client';

import { useState } from 'react';
import { Card } from '@shared/design/ui';
import { Download, Share2 } from '@shared/design/icons';
import type { PaymentSnapshot } from '@shared/api';

/**
 * Instruksi QRIS.
 *
 * QR-nya **selalu** gambar dari Midtrans (`actions` → `generate-qr-code`).
 * QR yang digambar sendiri dari nomor transaksi bukan QR yang diakui
 * penerbitnya, dan tidak akan bisa dibayar siapa pun.
 */
export function QrisView({ payment }: { payment: PaymentSnapshot }) {
  const [saving, setSaving] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  if (!payment.qrCodeUrl) {
    return (
      <Card className="stack-sm">
        <p className="t-body-md">
          Kode QR belum tersedia dari penyedia pembayaran.
        </p>
        <p className="t-caption-sm">
          Coba tekan Cek Status; bila tetap kosong, buat pembayaran ulang
          dengan metode lain.
        </p>
      </Card>
    );
  }

  /** Mengunduh lewat blob supaya nama berkasnya jelas, bukan string acak. */
  async function saveQr() {
    if (!payment.qrCodeUrl) return;
    setSaving(true);
    try {
      const res = await fetch(payment.qrCodeUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qris-${payment.midtransOrderId ?? payment.orderId}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // CORS bisa menolak pengunduhan; membuka di tab baru tetap memberi
      // pengguna jalan untuk menyimpannya sendiri.
      window.open(payment.qrCodeUrl, '_blank', 'noopener');
    } finally {
      setSaving(false);
    }
  }

  async function shareQr() {
    const text = `Pembayaran KOMIT ${payment.midtransOrderId ?? ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Kode QRIS KOMIT', text, url: payment.qrCodeUrl! });
        return;
      }
      await navigator.clipboard.writeText(payment.qrCodeUrl!);
      setShareNote('Tautan QR disalin.');
    } catch {
      setShareNote('Perangkat ini tidak mendukung berbagi langsung.');
    } finally {
      setTimeout(() => setShareNote(null), 2500);
    }
  }

  return (
    <Card className="stack-md">
      <div className="kc-qr">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={payment.qrCodeUrl}
          alt="Kode QRIS untuk pembayaran pesanan ini"
        />
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
        <button
          type="button"
          className="kc-btn kc-btn--secondary kc-btn--block"
          disabled={saving}
          onClick={() => void saveQr()}
        >
          <Download size={15} aria-hidden="true" />{' '}
          {saving ? 'Menyimpan…' : 'Simpan QR'}
        </button>
        <button
          type="button"
          className="kc-btn kc-btn--secondary kc-btn--block"
          onClick={() => void shareQr()}
        >
          <Share2 size={15} aria-hidden="true" /> Bagikan QR
        </button>
      </div>

      {shareNote && <p className="t-caption-sm">{shareNote}</p>}

      <div>
        <p className="kc-copy__label" style={{ marginBottom: 'var(--sp-sm)' }}>
          CARA MEMBAYAR
        </p>
        <ol className="kc-steps">
          <li>Buka aplikasi bank atau dompet digital apa pun yang mendukung QRIS.</li>
          <li>Pilih menu Bayar, Scan, atau QRIS.</li>
          <li>Pindai kode QR di atas.</li>
          <li>Periksa nama penerima dan nominalnya, lalu konfirmasi.</li>
          <li>Halaman ini akan berubah sendiri setelah pembayaran diterima.</li>
        </ol>
      </div>
    </Card>
  );
}

'use client';

import { useEffect, useState } from 'react';
import {
  Check,
  CircleCheckBig,
  CircleSlash,
  Clock,
  Copy,
  TriangleAlert,
  type LucideIcon,
} from '@shared/design/icons';
import type { PaymentView } from '@shared/api';

/**
 * Potongan kecil yang dipakai ketiga halaman instruksi.
 *
 * Dipisah supaya QRIS, VA, dan e-wallet tidak masing-masing menumbuhkan
 * versinya sendiri — hitung mundur yang berbeda di tiga halaman adalah cara
 * cepat membuat salah satunya salah.
 */

// ── Hitung mundur ─────────────────────────────────────────────────────────

function remaining(expiry: string | null): number | null {
  if (!expiry) return null;
  const ms = new Date(expiry).getTime() - Date.now();
  return Number.isNaN(ms) ? null : Math.max(0, ms);
}

function format(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Sisa waktu pembayaran.
 *
 * Dihitung dari `expiryTime` milik server, bukan dari durasi yang ditebak
 * klien: jam perangkat bisa meleset berjam-jam, dan hitung mundur yang
 * berakhir lebih cepat daripada kenyataan membuat orang berhenti membayar
 * padahal masih sempat.
 */
export function Countdown({
  expiryTime,
  onExpire,
}: {
  expiryTime: string | null;
  onExpire?: () => void;
}) {
  const [ms, setMs] = useState<number | null>(() => remaining(expiryTime));

  useEffect(() => {
    setMs(remaining(expiryTime));
    if (!expiryTime) return;

    const id = setInterval(() => {
      const left = remaining(expiryTime);
      setMs(left);
      if (left === 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiryTime, onExpire]);

  if (ms === null) return null;

  const urgent = ms > 0 && ms < 10 * 60 * 1000;
  const done = ms === 0;

  return (
    <span
      className={`kc-countdown ${done ? 'kc-countdown--done' : urgent ? 'kc-countdown--urgent' : ''}`.trim()}
    >
      <Clock size={13} aria-hidden="true" />
      {/* Kata "tersisa" tetap ditulis; warna mendesak saja bukan
          pemberitahuan bagi yang tidak membedakannya. */}
      {done ? 'Waktu pembayaran habis' : `${format(ms)} tersisa`}
    </span>
  );
}

// ── Baris yang bisa disalin ───────────────────────────────────────────────

export function CopyRow({
  label,
  value,
  ariaLabel,
}: {
  label: string;
  value: string;
  ariaLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard bisa ditolak peramban; nilainya tetap terlihat dan bisa
      // disalin manual, jadi kegagalannya tidak perlu menakuti siapa pun.
      setCopied(false);
    }
  }

  return (
    <div className="kc-copy">
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="kc-copy__label">{label}</p>
        <p className="kc-copy__value">{value}</p>
      </div>
      <button
        type="button"
        className="kc-copy__btn"
        data-copied={copied}
        aria-label={ariaLabel ?? `Salin ${label}`}
        onClick={() => void copy()}
      >
        {copied ? (
          <>
            <Check size={14} aria-hidden="true" /> Tersalin
          </>
        ) : (
          <>
            <Copy size={14} aria-hidden="true" /> Salin
          </>
        )}
      </button>
    </div>
  );
}

// ── Lencana status ────────────────────────────────────────────────────────

interface StatusView {
  label: string;
  description: string;
  icon: LucideIcon;
  fg: string;
  bg: string;
  waiting: boolean;
}

export const STATUS_VIEW: Record<PaymentView, StatusView> = {
  PENDING: {
    label: 'Menunggu Pembayaran',
    description: 'Selesaikan pembayaran sebelum waktunya habis.',
    icon: Clock,
    fg: 'var(--warning)',
    bg: '#fff6e0',
    waiting: true,
  },
  PAID: {
    label: 'Pembayaran Berhasil',
    description: 'Pesanan Anda diteruskan ke koperasi untuk disiapkan.',
    icon: CircleCheckBig,
    fg: 'var(--success)',
    bg: '#e7f6ec',
    waiting: false,
  },
  DENIED: {
    label: 'Pembayaran Ditolak',
    description: 'Penerbit menolak transaksi ini. Coba metode lain.',
    icon: TriangleAlert,
    fg: 'var(--primary)',
    bg: 'var(--primary-tint)',
    waiting: false,
  },
  CANCELLED: {
    label: 'Pembayaran Dibatalkan',
    description: 'Transaksi ini dibatalkan.',
    icon: CircleSlash,
    fg: 'var(--muted)',
    bg: 'var(--surface-strong)',
    waiting: false,
  },
  EXPIRED: {
    label: 'Pembayaran Kedaluwarsa',
    description: 'Waktu pembayaran habis. Buat pembayaran baru bila masih ingin melanjutkan.',
    icon: Clock,
    fg: 'var(--muted)',
    bg: 'var(--surface-strong)',
    waiting: false,
  },
  FAILED: {
    label: 'Pembayaran Gagal',
    description: 'Transaksi tidak dapat diselesaikan. Coba lagi atau pilih metode lain.',
    icon: TriangleAlert,
    fg: 'var(--primary)',
    bg: 'var(--primary-tint)',
    waiting: false,
  },
  REFUNDED: {
    label: 'Dana Dikembalikan',
    description: 'Dana untuk pesanan ini sudah dikembalikan.',
    icon: CircleCheckBig,
    fg: 'var(--staff-info)',
    bg: '#e3f0ff',
    waiting: false,
  },
};

export function PaymentStatusBadge({ status }: { status: PaymentView }) {
  const view = STATUS_VIEW[status];
  return (
    <span
      className={`kc-paystatus ${view.waiting ? 'kc-paystatus--waiting' : ''}`.trim()}
      style={{
        ['--status-fg' as string]: view.fg,
        ['--status-bg' as string]: view.bg,
      }}
    >
      <span className="kc-paystatus__dot" aria-hidden="true" />
      {view.label}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────

export function PaymentSkeleton() {
  return (
    <div className="kc-pay stack-md" aria-hidden="true">
      <div className="kc-pay__head">
        <div className="kc-skeleton" style={{ height: 52, width: 52, borderRadius: 16, margin: '0 auto var(--sp-md)' }} />
        <div className="kc-skeleton" style={{ height: 28, width: '55%', margin: '0 auto' }} />
        <div className="kc-skeleton" style={{ height: 12, width: '35%', margin: 'var(--sp-sm) auto 0' }} />
      </div>
      <div className="kc-skeleton" style={{ height: 240, borderRadius: 'var(--r-card)' }} />
      <div className="kc-skeleton" style={{ height: 56, borderRadius: 'var(--r-button)' }} />
    </div>
  );
}

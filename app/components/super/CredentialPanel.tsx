'use client';

import { useState } from 'react';
import { Mail } from '@shared/design/icons';
import type { ApprovalResult } from '@shared/api';

/**
 * Kata sandi awal hanya ada sekali.
 *
 * Panel ini tidak bisa ditutup dengan menekan latar: setelah hilang, tidak
 * ada cara membaca kata sandinya lagi — yang tersimpan di server hanya
 * hash-nya — dan satu-satunya jalan keluar adalah menyetelnya ulang.
 */
export function CredentialPanel({
  result,
  onClose,
}: {
  result: ApprovalResult;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const text =
    `Akun Admin Kopdes ${result.kopdes.name}\n` +
    `Email: ${result.admin.email}\n` +
    `Kata sandi: ${result.initialPassword}\n\n` +
    `Silakan masuk dan segera ganti kata sandinya.`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Akun berhasil dibuat"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.45)',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--sp-base)',
      }}
    >
      <div className="staff-surface stack-md" style={{ width: 'min(520px, 100%)' }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--st-ink)' }}>
            Koperasi &amp; akun dibuat
          </p>
          <p style={{ fontSize: 13, color: 'var(--st-muted)', marginTop: 2 }}>
            {result.kopdes.name}
          </p>
        </div>

        <div className="staff-surface" style={{ background: 'var(--st-bg)' }}>
          <p className="staff-order__meta">
            <Mail size={12} aria-hidden="true" /> {result.admin.email}
          </p>
          <p
            style={{
              marginTop: 'var(--sp-sm)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1,
              color: 'var(--st-ink)',
              wordBreak: 'break-all',
            }}
          >
            {result.initialPassword}
          </p>
        </div>

        <p style={{ fontSize: 13, color: 'var(--st-primary)', fontWeight: 600 }}>
          Salin sekarang. Kata sandi ini tidak ditampilkan lagi — server hanya
          menyimpan hash-nya.
        </p>

        <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="staff-btn"
            style={{ width: 'auto' }}
            onClick={() => {
              // Clipboard bisa ditolak peramban (halaman tidak fokus, izin
              // dicabut); kegagalannya tidak boleh menutup panel dan
              // menghilangkan kata sandinya.
              void navigator.clipboard
                ?.writeText(text)
                .then(() => setCopied(true))
                .catch(() => setCopied(false));
            }}
          >
            {copied ? 'Tersalin ✓' : 'Salin email & kata sandi'}
          </button>
          <a
            className="staff-btn staff-btn--ghost"
            style={{ width: 'auto', lineHeight: '36px' }}
            href={`https://wa.me/?text=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Kirim lewat WhatsApp
          </a>
        </div>

        <button type="button" className="staff-btn staff-btn--ghost" onClick={onClose}>
          Saya sudah menyalinnya
        </button>
      </div>
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { RefreshCw } from '@shared/design/icons';

/** Judul bagian dengan aksi opsional — padanan `KopdesSectionHeader`. */
export function StaffSection({
  title,
  actionLabel,
  href,
  children,
}: {
  title: string;
  actionLabel?: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <section className="staff-section">
      <div className="staff-section__head">
        <h2 className="staff-section__title">{title}</h2>
        {actionLabel && href && (
          <Link href={href} className="staff-section__action">
            {actionLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Kegagalan satu bagian ditulis di tempat bagian itu berada, bukan sebagai
 * dialog yang menutupi halaman: bagian lain masih terbaca dan masih berguna.
 */
export function StaffError({
  message = 'Bagian ini belum berhasil dimuat',
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="staff-error">
      <p>{message}</p>
      <button type="button" className="staff-btn staff-btn--ghost" style={{ width: 'auto' }} onClick={onRetry}>
        <RefreshCw size={14} aria-hidden="true" /> Coba Lagi
      </button>
    </div>
  );
}

export function StaffSkeleton({
  height,
  width,
  radius,
}: {
  height: number | string;
  width?: number | string;
  radius?: number;
}) {
  return (
    <div
      className="staff-skeleton"
      style={{ height, width: width ?? '100%', borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

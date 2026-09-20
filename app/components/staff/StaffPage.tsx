'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, Lock, RefreshCw, X } from '@shared/design/icons';
import { useStaff } from './StaffContext';

export function StaffPageHeader({ title, description, onRefresh }: {
  title: string; description?: string; onRefresh?: () => void;
}) {
  return (
    <div className="staff-page-head">
      <Link href="/pegawai" className="staff-icon-btn" aria-label="Kembali ke beranda pegawai"><ArrowLeft size={20} /></Link>
      <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {onRefresh && <button type="button" className="staff-icon-btn" onClick={onRefresh} aria-label="Muat ulang"><RefreshCw size={18} /></button>}
    </div>
  );
}

export function StaffAccess({ permission, children }: { permission: string; children: ReactNode }) {
  const { can } = useStaff();
  if (!can(permission)) return (
    <div className="staff-surface staff-empty staff-stack">
      <Lock size={28} aria-hidden="true" />
      <h1 className="staff-section__title">Akses terbatas</h1>
      <p>Halaman ini tidak termasuk wewenang Anda. Hubungi Admin Kopdes bila memerlukan akses.</p>
      <Link href="/pegawai" className="staff-section__action">Kembali ke Beranda</Link>
    </div>
  );
  return children;
}

/** Native dialog supplies focus trapping, Escape, and focus restoration. */
export function StaffDialog({ title, children, onClose, busy = false }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return (
    <dialog ref={dialog} className="staff-dialog" aria-label={title}
      onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      <div className="staff-page-head">
        <h2 className="staff-section__title">{title}</h2>
        <button type="button" className="staff-icon-btn" aria-label="Tutup" disabled={busy} onClick={onClose}><X size={20} /></button>
      </div>
      {children}
    </dialog>
  );
}

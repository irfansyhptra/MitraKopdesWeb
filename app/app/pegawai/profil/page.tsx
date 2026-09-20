'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/lib/auth';
import { useStaff } from '@/components/staff/StaffContext';
import { roleLabel } from '@/components/staff/StaffShell';
import { StaffDialog, StaffPageHeader } from '@/components/staff/StaffPage';
import { LogOut, Mail, Phone, Store } from '@shared/design/icons';

export default function StaffProfilePage() {
  const { user, role, store } = useStaff();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  return <>
    <StaffPageHeader title="Profil" description="Identitas dan akun pegawai koperasi" />
    <div className="staff-profile staff-stack">
      <section className="staff-profile__identity">
        <span className="staff-profile__avatar">{user?.name.trim()[0]?.toUpperCase() ?? '?'}</span>
        <h2>{user?.name}</h2><span className="staff-chip">{roleLabel(role)}</span>
      </section>
      <section className="staff-surface">
        <dl className="staff-profile__details">
          <div><Mail size={20} /><dt>Email</dt><dd>{user?.email || '—'}</dd></div>
          <div><Phone size={20} /><dt>Telepon</dt><dd>{user?.phone || 'Belum diisi'}</dd></div>
          <div><Store size={20} /><dt>Koperasi</dt><dd>{store?.name ?? user?.kopdes?.name ?? 'Belum ditetapkan'}</dd></div>
        </dl>
      </section>
      <button className="staff-btn staff-btn--outline" onClick={() => setConfirm(true)}><LogOut size={18} /> Keluar</button>
    </div>
    {confirm && <StaffDialog title="Keluar dari akun?" onClose={() => setConfirm(false)}>
      <p className="staff-muted">Anda perlu masuk kembali untuk mengakses portal pegawai.</p>
      <div className="staff-actions"><button className="staff-btn staff-btn--ghost" onClick={() => setConfirm(false)}>Batal</button>
        <button className="staff-btn" onClick={() => { clearTokens(); router.replace('/login'); router.refresh(); }}>Keluar</button></div>
    </StaffDialog>}
  </>;
}

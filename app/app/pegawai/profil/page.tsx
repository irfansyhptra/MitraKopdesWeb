'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/lib/auth';
import { useStaff } from '@/components/staff/StaffContext';
import { roleLabel } from '@/components/staff/StaffShell';
import { StaffDialog, StaffPageHeader } from '@/components/staff/StaffPage';
import { KopdesProfileForm } from '@/components/staff/KopdesProfileForm';
import { LogOut, Mail, Phone, Store } from '@shared/design/icons';
import { api } from '@/lib/api';
import { ImagePickerField } from '@/components/profile/ImagePickerField';

export default function StaffProfilePage() {
  const { user, role, store, reload } = useStaff();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setNotice(null);
    try {
      await api.updateMyProfile({
        name: String(form.get('name') ?? '').trim(),
        phone: String(form.get('phone') ?? '').trim() || undefined,
      });
      if (avatar) await api.updateAvatar(avatar);
      setNotice('Profil akun berhasil diperbarui.');
      reload();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return <>
    <StaffPageHeader title="Profil" description="Identitas dan akun pegawai koperasi" />
    <div className="staff-profile staff-stack">
      <section className="staff-profile__identity">
        <span className="staff-profile__avatar">
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="" />
            : user?.name.trim()[0]?.toUpperCase() ?? '?'}
        </span>
        <h2>{user?.name}</h2><span className="staff-chip">{roleLabel(role)}</span>
      </section>
      <form className="staff-surface staff-stack" onSubmit={(event) => void saveAccount(event)}>
        <h2 className="staff-section__title">Pengaturan Akun</h2>
        <ImagePickerField
          label="Foto profil"
          hint="JPG, PNG, atau WebP · maksimal 4 MB"
          currentUrl={user?.avatarUrl}
          shape="avatar"
          disabled={saving}
          onChange={setAvatar}
        />
        <div className="field"><label htmlFor="staff-name">Nama</label><input id="staff-name" name="name" required defaultValue={user?.name ?? ''} /></div>
        <div className="field"><label htmlFor="staff-phone">Telepon</label><input id="staff-phone" name="phone" type="tel" defaultValue={user?.phone ?? ''} /></div>
        {notice && <p className="staff-muted" role="status">{notice}</p>}
        <button className="staff-btn" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan Akun'}</button>
      </form>
      <section className="staff-surface">
        <dl className="staff-profile__details">
          <div><Mail size={20} /><dt>Email</dt><dd>{user?.email || '—'}</dd></div>
          <div><Phone size={20} /><dt>Telepon</dt><dd>{user?.phone || 'Belum diisi'}</dd></div>
          <div><Store size={20} /><dt>Koperasi</dt><dd>{store?.name ?? user?.kopdes?.name ?? 'Belum ditetapkan'}</dd></div>
        </dl>
      </section>
      <KopdesProfileForm />
      <button className="staff-btn staff-btn--outline" onClick={() => setConfirm(true)}><LogOut size={18} /> Keluar</button>
    </div>
    {confirm && <StaffDialog title="Keluar dari akun?" onClose={() => setConfirm(false)}>
      <p className="staff-muted">Anda perlu masuk kembali untuk mengakses portal pegawai.</p>
      <div className="staff-actions"><button className="staff-btn staff-btn--ghost" onClick={() => setConfirm(false)}>Batal</button>
        <button className="staff-btn" onClick={() => { clearTokens(); router.replace('/login'); router.refresh(); }}>Keluar</button></div>
    </StaffDialog>}
  </>;
}

'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useSuperAdmin } from '@/components/super/SuperContext';
import { ImagePickerField } from '@/components/profile/ImagePickerField';

export default function SuperAdminProfilePage() {
  const account = useSuperAdmin();
  const user = account?.user;
  const [avatar, setAvatar] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
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
      setNotice('Profil berhasil diperbarui.');
      account?.reload();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;
  return (
    <div className="staff-stack">
      <div className="staff-page-head"><div><h1>Profil</h1><p>Identitas akun pengurus sistem</p></div></div>
      <form className="staff-surface staff-stack" onSubmit={(event) => void submit(event)}>
        <ImagePickerField label="Foto profil" hint="JPG, PNG, atau WebP · maksimal 4 MB" currentUrl={user.avatarUrl} shape="avatar" disabled={saving} onChange={setAvatar} />
        <div className="field"><label htmlFor="super-name">Nama</label><input id="super-name" name="name" required defaultValue={user.name} /></div>
        <div className="field"><label htmlFor="super-email">Email</label><input id="super-email" value={user.email} disabled /></div>
        <div className="field"><label htmlFor="super-phone">Telepon</label><input id="super-phone" name="phone" type="tel" defaultValue={user.phone ?? ''} /></div>
        {notice && <p className="staff-muted" role="status">{notice}</p>}
        <button className="staff-btn" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan Profil'}</button>
      </form>
    </div>
  );
}

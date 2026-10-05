'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useCourier } from '@/components/courier/CourierGate';
import { ImagePickerField } from '@/components/profile/ImagePickerField';

export default function CourierProfilePage() {
  const account = useCourier();
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
      await api.updateMyProfile({ name: String(form.get('name') ?? '').trim(), phone: String(form.get('phone') ?? '').trim() || undefined });
      if (avatar) await api.updateAvatar(avatar);
      setNotice('Profil kurir berhasil diperbarui.');
      account?.reload();
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;
  return <div className="staff-stack">
    <div className="staff-page-head"><div><h1>Profil Kurir</h1><p>Identitas yang dilihat pelanggan dan pengurus</p></div></div>
    <form className="staff-surface staff-stack" onSubmit={(event) => void submit(event)}>
      <ImagePickerField label="Foto profil" hint="JPG, PNG, atau WebP · maksimal 4 MB" currentUrl={user.avatarUrl} shape="avatar" disabled={saving} onChange={setAvatar} />
      <div className="field"><label htmlFor="courier-name">Nama</label><input id="courier-name" name="name" required defaultValue={user.name} /></div>
      <div className="field"><label htmlFor="courier-email">Email</label><input id="courier-email" value={user.email} disabled /></div>
      <div className="field"><label htmlFor="courier-phone">Telepon</label><input id="courier-phone" name="phone" type="tel" defaultValue={user.phone ?? ''} /></div>
      {notice && <p className="staff-muted" role="status">{notice}</p>}
      <button className="staff-btn" type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan Profil'}</button>
    </form>
  </div>;
}

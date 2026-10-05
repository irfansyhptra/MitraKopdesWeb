'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { clearTokens } from '@/lib/auth';
import { useSeller } from '@/components/seller/SellerContext';
import { CircleCheckBig, LogOut, Store } from '@shared/design/icons';
import { ImagePickerField } from '@/components/profile/ImagePickerField';

export default function SellerProfilePage() {
  const { user, store, reload } = useSeller();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setMessage(null);
    try {
      await api.updateSellerProfile({
        businessName: String(form.get('businessName') ?? '').trim(),
        description: String(form.get('description') ?? '').trim(),
        address: String(form.get('address') ?? '').trim(),
        phone: String(form.get('phone') ?? '').trim(),
      });
      if (avatar) await api.updateAvatar(avatar);
      if (logo || banner) await api.updateSellerMedia({ logo: logo ?? undefined, banner: banner ?? undefined });
      setMessage('Profil toko berhasil diperbarui.'); reload();
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  return <>
    <div className="staff-page-head seller-page-heading"><div><h1>Profil Toko</h1><p>Informasi ini tampil pada halaman toko pelanggan</p></div></div>
    <section className="staff-surface seller-profile-head"><span><Store size={26} /></span><div><h2>{store.businessName}</h2><p>{store.status.replaceAll('_', ' ')}</p></div></section>
    <form className="staff-stack" onSubmit={(event) => void submit(event)}>
      <fieldset className="staff-surface staff-stack" disabled={busy}>
        <legend className="staff-form-legend">Foto Pemilik</legend>
        <ImagePickerField
          label="Foto profil akun"
          hint="JPG, PNG, atau WebP · maksimal 4 MB"
          currentUrl={user.avatarUrl}
          shape="avatar"
          disabled={busy}
          onChange={setAvatar}
        />
      </fieldset>
      <fieldset className="staff-surface staff-stack" disabled={busy}>
        <legend className="staff-form-legend">Identitas Visual Toko</legend>
        <ImagePickerField
          label="Logo atau foto toko"
          hint="Digunakan pada kartu toko dan profil UMKM"
          currentUrl={store.photoUrl}
          shape="avatar"
          disabled={busy}
          onChange={setLogo}
        />
        <ImagePickerField
          label="Banner toko"
          hint="Gunakan foto lanskap agar tampil utuh pada halaman toko"
          currentUrl={store.bannerUrl}
          shape="banner"
          disabled={busy}
          onChange={setBanner}
        />
      </fieldset>
      <fieldset className="staff-surface staff-stack" disabled={busy}>
        <legend className="staff-form-legend">Informasi Toko</legend>
        <div className="field"><label htmlFor="businessName">Nama Usaha</label><input id="businessName" name="businessName" required defaultValue={store.businessName} /></div>
        <div className="field"><label htmlFor="description">Deskripsi</label><textarea id="description" name="description" required rows={5} defaultValue={store.description ?? ''} /></div>
        <div className="field"><label htmlFor="address">Alamat</label><textarea id="address" name="address" required rows={3} defaultValue={store.address} /></div>
        <div className="field"><label htmlFor="phone">Nomor Telepon</label><input id="phone" name="phone" type="tel" required defaultValue={store.phone ?? ''} /></div>
      </fieldset>
      {message && <p className="staff-surface seller-form-message"><CircleCheckBig size={17} />{message}</p>}
      <button className="staff-btn" type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan Profil Toko'}</button>
      <button className="staff-btn staff-btn--outline" type="button" onClick={() => { clearTokens(); router.replace('/login'); router.refresh(); }}><LogOut size={17} />Keluar</button>
    </form>
  </>;
}

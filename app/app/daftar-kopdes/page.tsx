'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button, Card, Message, SectionHeader } from '@shared/design/ui';

/**
 * Formulir pengajuan bergabung — halaman publik.
 *
 * Tidak butuh akun: koperasi yang belum bergabung tentu belum punya. Yang
 * diminta hanya cukup untuk memutuskan dan menghubungi. Koordinat tidak
 * ditanyakan di sini — pengurus desa sering tidak tahu titiknya, dan
 * memaksakannya hanya akan membuat formulir ditinggalkan separuh jalan.
 */

const FIELDS = [
  { name: 'kopdesName', label: 'Nama koperasi', required: true, placeholder: 'Kopdes Merah Putih …' },
  { name: 'address', label: 'Alamat', required: true, placeholder: 'Jl. …' },
  { name: 'village', label: 'Desa', required: true },
  { name: 'district', label: 'Kecamatan', required: true },
  { name: 'city', label: 'Kabupaten/Kota', required: true },
  { name: 'province', label: 'Provinsi', required: true },
  { name: 'postalCode', label: 'Kode pos', required: false },
] as const;

const CONTACT = [
  { name: 'contactName', label: 'Nama pengurus', type: 'text', required: true },
  { name: 'contactEmail', label: 'Email pengurus', type: 'email', required: true },
  { name: 'contactPhone', label: 'Nomor WhatsApp', type: 'tel', required: true },
] as const;

type FormState = Record<string, string>;

export default function DaftarKopdesPage() {
  const [form, setForm] = useState<FormState>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set(name: string, value: string) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  const required = [
    ...FIELDS.filter((f) => f.required).map((f) => f.name),
    ...CONTACT.filter((f) => f.required).map((f) => f.name),
  ];
  const valid = required.every((n) => (form[n] ?? '').trim().length > 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.submitKopdesApplication({
        kopdesName: form.kopdesName.trim(),
        address: form.address.trim(),
        village: form.village.trim(),
        district: form.district.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        ...(form.postalCode?.trim() ? { postalCode: form.postalCode.trim() } : {}),
        ...(form.description?.trim() ? { description: form.description.trim() } : {}),
        ...(form.notes?.trim() ? { notes: form.notes.trim() } : {}),
      });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Message
        title="Pengajuan terkirim"
        body="Pengurus sistem akan meninjau dan menghubungi Anda lewat email atau WhatsApp. Akun Admin Kopdes dikirim setelah pengajuan disetujui."
        actionLabel="Kembali ke Beranda"
        href="/"
      />
    );
  }

  return (
    <>
      <div className="page-head">
        <div className="page-head__text">
          <h1 className="page-title">Daftarkan Koperasi Desa</h1>
          <p className="page-sub">
            Isi data koperasi dan satu pengurus yang akan mengelolanya. Kami
            tinjau lalu kirimkan akunnya.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="kc-split">
        <div className="stack-md">
          <Card className="stack-md">
            <SectionHeader title="Tentang Koperasi" />
            {FIELDS.map((f) => (
              <div className="field" key={f.name}>
                <label htmlFor={f.name}>
                  {f.label}
                  {!f.required && ' (opsional)'}
                </label>
                <input
                  id={f.name}
                  type="text"
                  required={f.required}
                  placeholder={'placeholder' in f ? f.placeholder : undefined}
                  value={form[f.name] ?? ''}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              </div>
            ))}
            <div className="field">
              <label htmlFor="description">Deskripsi singkat (opsional)</label>
              <textarea
                id="description"
                rows={3}
                maxLength={600}
                value={form.description ?? ''}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
          </Card>

          <Card className="stack-md">
            <SectionHeader title="Pengurus" />
            <p className="t-caption-sm">
              Orang ini yang akan menerima akun Admin Kopdes dan mengangkat
              pegawainya sendiri.
            </p>
            {CONTACT.map((f) => (
              <div className="field" key={f.name}>
                <label htmlFor={f.name}>{f.label}</label>
                <input
                  id={f.name}
                  type={f.type}
                  required
                  value={form[f.name] ?? ''}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              </div>
            ))}
            <div className="field">
              <label htmlFor="notes">Catatan tambahan (opsional)</label>
              <textarea
                id="notes"
                rows={3}
                maxLength={600}
                value={form.notes ?? ''}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
          </Card>
        </div>

        <aside className="kc-split__aside">
          <Card className="stack-md">
            <SectionHeader title="Setelah mengirim" />
            <ol
              className="t-caption"
              style={{ paddingLeft: '1.1rem', display: 'grid', gap: 6 }}
            >
              <li>Pengurus sistem meninjau data koperasi Anda.</li>
              <li>
                Bila disetujui, akun Admin Kopdes dikirim ke email atau
                WhatsApp pengurus.
              </li>
              <li>Masuk, ganti kata sandi, lalu angkat pegawai koperasi.</li>
            </ol>

            {error && <p className="form-error">{error}</p>}

            <Button block type="submit" disabled={!valid || busy}>
              {busy ? 'Mengirim…' : 'Kirim Pengajuan'}
            </Button>

            <p className="t-caption-sm">
              Sudah punya akun? <Link href="/login">Masuk di sini</Link>.
            </p>
          </Card>
        </aside>
      </form>
    </>
  );
}

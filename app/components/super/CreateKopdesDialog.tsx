'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { ApprovalResult } from '@shared/api';

/**
 * Membuat koperasi tanpa melewati formulir pengajuan.
 *
 * Untuk permintaan yang datang langsung — telepon, surat, tatap muka. Isinya
 * gabungan formulir publik dan data yang biasanya dilengkapi saat menyetujui,
 * karena pengurus sistem sudah berbicara dengan orangnya dan bisa mengisi
 * semuanya sekaligus.
 *
 * Koordinat wajib di sini. Pada jalur pengajuan ia bisa ditunda sampai
 * peninjauan; di sini tidak ada langkah kedua, dan tanpa koordinat koperasinya
 * tidak akan pernah muncul di pencarian terdekat pelanggan.
 */

const KOPDES_FIELDS = [
  { name: 'kopdesName', label: 'Nama koperasi', required: true, placeholder: 'Kopdes Merah Putih …' },
  { name: 'address', label: 'Alamat', required: true },
  { name: 'village', label: 'Desa', required: true },
  { name: 'district', label: 'Kecamatan', required: true },
  { name: 'city', label: 'Kabupaten/Kota', required: true },
  { name: 'province', label: 'Provinsi', required: true },
  { name: 'postalCode', label: 'Kode pos', required: false },
] as const;

const CONTACT_FIELDS = [
  { name: 'contactName', label: 'Nama pengurus', type: 'text', hint: undefined },
  {
    name: 'contactEmail',
    // Sistem ini masuk dengan email; tidak ada kolom username terpisah di
    // tabel User. Menuliskannya begini supaya pengurus sistem tahu persis
    // apa yang harus diteruskan sebagai "username".
    label: 'Email pengurus — dipakai untuk masuk',
    type: 'email',
    hint: 'Ini yang diketik pengurus di halaman masuk.',
  },
  { name: 'contactPhone', label: 'Nomor WhatsApp', type: 'tel', hint: undefined },
] as const;

const MIN_PASSWORD = 8;

export function CreateKopdesDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (result: ApprovalResult) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({});
  // Bawaannya dibuatkan sistem: kata sandi acak 12 karakter lebih baik
  // daripada yang diketik terburu-buru, dan hasilnya tetap ditampilkan untuk
  // diteruskan. Mengetik sendiri disediakan untuk pengurus yang memintanya.
  const [ownPassword, setOwnPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (name: string, value: string) =>
    setForm((f) => ({ ...f, [name]: value }));

  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  const coordsValid =
    (form.latitude ?? '').trim() !== '' &&
    (form.longitude ?? '').trim() !== '' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;

  const password = form.initialPassword ?? '';
  const passwordValid = !ownPassword || password.length >= MIN_PASSWORD;

  const required = [
    ...KOPDES_FIELDS.filter((f) => f.required).map((f) => f.name),
    ...CONTACT_FIELDS.map((f) => f.name),
  ];
  const valid =
    required.every((n) => (form[n] ?? '').trim() !== '') &&
    coordsValid &&
    passwordValid;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      onCreated(
        await api.createKopdesDirect({
          kopdesName: form.kopdesName.trim(),
          address: form.address.trim(),
          village: form.village.trim(),
          district: form.district.trim(),
          city: form.city.trim(),
          province: form.province.trim(),
          latitude: lat,
          longitude: lng,
          contactName: form.contactName.trim(),
          contactEmail: form.contactEmail.trim(),
          contactPhone: form.contactPhone.trim(),
          ...(form.postalCode?.trim() ? { postalCode: form.postalCode.trim() } : {}),
          ...(form.description?.trim() ? { description: form.description.trim() } : {}),
          // Tidak dikirim sama sekali bila dibuatkan sistem — mengirim string
          // kosong akan ditolak validasi panjang minimum di server.
          ...(ownPassword ? { initialPassword: password } : {}),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buat koperasi langsung"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.35)',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--sp-base)',
      }}
    >
      <div
        className="staff-surface stack-md"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(600px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--st-ink)' }}>
            Buat Koperasi Langsung
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--st-muted)', marginTop: 2 }}>
            Untuk permintaan yang datang tanpa melalui formulir. Koperasi dan
            akun pengurusnya dibuat sekaligus.
          </p>
        </div>

        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--st-muted)' }}>
          Koperasi
        </p>
        {KOPDES_FIELDS.map((f) => (
          <div className="field" key={f.name}>
            <label htmlFor={`ck-${f.name}`}>
              {f.label}
              {!f.required && ' (opsional)'}
            </label>
            <input
              id={`ck-${f.name}`}
              type="text"
              placeholder={'placeholder' in f ? f.placeholder : undefined}
              value={form[f.name] ?? ''}
              onChange={(e) => set(f.name, e.target.value)}
            />
          </div>
        ))}

        <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 150 }}>
            <label htmlFor="ck-lat">Latitude</label>
            <input
              id="ck-lat"
              inputMode="decimal"
              placeholder="5.5483"
              value={form.latitude ?? ''}
              onChange={(e) => set('latitude', e.target.value)}
            />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 150 }}>
            <label htmlFor="ck-lng">Longitude</label>
            <input
              id="ck-lng"
              inputMode="decimal"
              placeholder="95.3238"
              value={form.longitude ?? ''}
              onChange={(e) => set('longitude', e.target.value)}
            />
          </div>
        </div>
        <p className="t-caption-sm" style={{ marginTop: -6 }}>
          Wajib. Tanpa koordinat, koperasi ini tidak akan muncul di pencarian
          terdekat pelanggan.
        </p>

        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--st-muted)' }}>
          Pengurus — akan menjadi Admin Kopdes
        </p>
        {CONTACT_FIELDS.map((f) => (
          <div className="field" key={f.name}>
            <label htmlFor={`ck-${f.name}`}>{f.label}</label>
            <input
              id={`ck-${f.name}`}
              type={f.type}
              autoComplete="off"
              value={form[f.name] ?? ''}
              onChange={(e) => set(f.name, e.target.value)}
            />
            {f.hint && <p className="t-caption-sm">{f.hint}</p>}
          </div>
        ))}

        <fieldset style={{ border: 'none' }}>
          <legend
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--st-muted)',
              marginBottom: 'var(--sp-sm)',
            }}
          >
            Kata sandi awal
          </legend>

          <label style={choiceStyle}>
            <input
              type="radio"
              name="pwmode"
              checked={!ownPassword}
              onChange={() => setOwnPassword(false)}
              style={{ accentColor: 'var(--st-primary)' }}
            />
            <span>
              <strong style={{ fontSize: 13.5, color: 'var(--st-ink)' }}>
                Buatkan otomatis
              </strong>
              <span className="t-caption-sm" style={{ display: 'block' }}>
                12 karakter acak, tanpa huruf yang mudah salah dengar seperti
                0/O dan 1/l/I.
              </span>
            </span>
          </label>

          <label style={choiceStyle}>
            <input
              type="radio"
              name="pwmode"
              checked={ownPassword}
              onChange={() => setOwnPassword(true)}
              style={{ accentColor: 'var(--st-primary)' }}
            />
            <span>
              <strong style={{ fontSize: 13.5, color: 'var(--st-ink)' }}>
                Tentukan sendiri
              </strong>
              <span className="t-caption-sm" style={{ display: 'block' }}>
                Untuk pengurus yang sudah menyebutkan kata sandi yang
                diinginkannya.
              </span>
            </span>
          </label>

          {ownPassword && (
            <div className="field" style={{ marginTop: 'var(--sp-sm)' }}>
              <label htmlFor="ck-password">Kata sandi</label>
              <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
                <input
                  id="ck-password"
                  // Ditampilkan apa adanya bila diminta: pengurus sistem
                  // memang harus membacanya untuk diteruskan, dan menutupinya
                  // hanya membuat salah ketik tidak ketahuan.
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD}
                  value={password}
                  onChange={(e) => set('initialPassword', e.target.value)}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button
                  type="button"
                  className="staff-btn staff-btn--ghost"
                  style={{ width: 'auto' }}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
              <p className="t-caption-sm">
                Minimal {MIN_PASSWORD} karakter.
                {password.length > 0 && password.length < MIN_PASSWORD
                  ? ` Kurang ${MIN_PASSWORD - password.length} lagi.`
                  : ''}
              </p>
            </div>
          )}

          <p className="t-caption-sm" style={{ marginTop: 'var(--sp-sm)' }}>
            Apa pun pilihannya, kata sandi ditampilkan sekali setelah akun
            dibuat agar bisa Anda teruskan — server hanya menyimpan hash-nya.
          </p>
        </fieldset>

        {error && <p className="form-error">{error}</p>}

        <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
          <button type="button" className="staff-btn staff-btn--ghost" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="staff-btn"
            disabled={!valid || busy}
            onClick={() => void submit()}
          >
            {busy ? 'Membuat…' : 'Buat Koperasi & Akun'}
          </button>
        </div>
      </div>
    </div>
  );
}

const choiceStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--sp-md)',
  alignItems: 'flex-start',
  padding: 'var(--sp-sm) 0',
  cursor: 'pointer',
};

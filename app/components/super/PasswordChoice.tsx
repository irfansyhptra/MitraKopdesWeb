'use client';

import { useState } from 'react';

/**
 * Pemilih kata sandi awal — dipakai jalur persetujuan maupun pembuatan
 * langsung.
 *
 * Satu komponen, bukan dua salinan: keduanya menghasilkan akun Admin Kopdes
 * yang sama, dan aturan seperti panjang minimum atau perlakuan mode otomatis
 * tidak boleh berbeda antara keduanya.
 */

export const MIN_PASSWORD = 8;

/**
 * Nilai yang dikirim ke server.
 *
 * `undefined` saat dibuatkan sistem — bukan string kosong. String kosong
 * akan ditolak validasi panjang minimum, dan pesan "minimal 8 karakter"
 * tidak masuk akal bagi orang yang tidak pernah mengetik kata sandi apa pun.
 */
export function passwordPayload(
  own: boolean,
  value: string,
): { initialPassword?: string } {
  return own ? { initialPassword: value } : {};
}

export function isPasswordValid(own: boolean, value: string): boolean {
  return !own || value.length >= MIN_PASSWORD;
}

export function PasswordChoice({
  own,
  value,
  onOwnChange,
  onValueChange,
  /** Membedakan grup radio bila ada lebih dari satu form di layar. */
  idPrefix,
}: {
  own: boolean;
  value: string;
  onOwnChange: (own: boolean) => void;
  onValueChange: (value: string) => void;
  idPrefix: string;
}) {
  const [show, setShow] = useState(false);

  return (
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
          name={`pwmode-${idPrefix}`}
          checked={!own}
          onChange={() => onOwnChange(false)}
          style={{ accentColor: 'var(--st-primary)' }}
        />
        <span>
          <strong style={{ fontSize: 13.5, color: 'var(--st-ink)' }}>
            Buatkan otomatis
          </strong>
          <span className="t-caption-sm" style={{ display: 'block' }}>
            12 karakter acak, tanpa huruf yang mudah salah dengar seperti 0/O
            dan 1/l/I.
          </span>
        </span>
      </label>

      <label style={choiceStyle}>
        <input
          type="radio"
          name={`pwmode-${idPrefix}`}
          checked={own}
          onChange={() => onOwnChange(true)}
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

      {own && (
        <div className="field" style={{ marginTop: 'var(--sp-sm)' }}>
          <label htmlFor={`${idPrefix}-password`}>Kata sandi</label>
          <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
            <input
              id={`${idPrefix}-password`}
              // Boleh ditampilkan: pengurus sistem memang harus membacanya
              // untuk diteruskan, dan menutupinya hanya membuat salah ketik
              // tidak ketahuan sampai koperasinya gagal masuk.
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={MIN_PASSWORD}
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              style={{ flex: 1, minWidth: 0 }}
            />
            <button
              type="button"
              className="staff-btn staff-btn--ghost"
              style={{ width: 'auto' }}
              aria-pressed={show}
              onClick={() => setShow((v) => !v)}
            >
              {show ? 'Sembunyikan' : 'Lihat'}
            </button>
          </div>
          <p className="t-caption-sm">
            Minimal {MIN_PASSWORD} karakter.
            {value.length > 0 && value.length < MIN_PASSWORD
              ? ` Kurang ${MIN_PASSWORD - value.length} lagi.`
              : ''}
          </p>
        </div>
      )}

      <p className="t-caption-sm" style={{ marginTop: 'var(--sp-sm)' }}>
        Apa pun pilihannya, kata sandi ditampilkan sekali setelah akun dibuat
        agar bisa Anda teruskan — server hanya menyimpan hash-nya.
      </p>
    </fieldset>
  );
}

const choiceStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--sp-md)',
  alignItems: 'flex-start',
  padding: 'var(--sp-sm) 0',
  cursor: 'pointer',
};

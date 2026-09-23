'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useStaff } from './StaffContext';
import { useAsync } from './useAsync';
import { Permissions } from '@shared/api';
import type { Koperasi } from '@shared/api';
import { Clock, Store } from '@shared/design/icons';

/**
 * Profil koperasi yang diurus pemiliknya: deskripsi, kontak, daftar layanan,
 * dan jam operasional.
 *
 * Keempatnya tampil di halaman publik Kopdes, dan sebelum ini tidak ada satu
 * pun jalur untuk mengisinya — kolomnya hanya bisa disentuh lewat seed.
 *
 * Alamat dan koordinat sengaja tidak ada di sini: keduanya menentukan hasil
 * pencarian terdekat dan siapa yang dianggap sedesa, jadi perubahannya lewat
 * Super Admin.
 */

const DAYS: [string, string][] = [
  ['mon', 'Senin'],
  ['tue', 'Selasa'],
  ['wed', 'Rabu'],
  ['thu', 'Kamis'],
  ['fri', 'Jumat'],
  ['sat', 'Sabtu'],
  ['sun', 'Minggu'],
];

export function KopdesProfileForm() {
  const { user, can } = useStaff();
  const kopdesId = user?.kopdes?.id ?? user?.kopdesId ?? null;
  const allowed = can(Permissions.kopdesPolicyManage) && !!kopdesId;

  const profile = useAsync<Koperasi | null>(
    () => (kopdesId ? api.getKoperasi(kopdesId) : Promise.resolve(null)),
    [kopdesId],
  );

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!allowed || profile.loading || !profile.data) return null;
  const kopdes = profile.data;

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    const form = new FormData(e.currentTarget);
    const hours: Record<string, { open: string; close: string } | null> = {};
    for (const [key] of DAYS) {
      const open = String(form.get(`${key}-open`) ?? '').trim();
      const close = String(form.get(`${key}-close`) ?? '').trim();
      // Satu kolom terisi tanpa pasangannya berarti hari itu belum selesai
      // diisi — dianggap tutup, bukan dikirim setengah dan ditolak server.
      hours[key] = open && close ? { open, close } : null;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.updateKopdesProfile({
        description: String(form.get('description') ?? '').trim(),
        phone: String(form.get('phone') ?? '').trim() || undefined,
        serviceCategories: String(form.get('services') ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        operatingHours: hours,
      });
      setNotice('Profil koperasi tersimpan.');
      profile.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="staff-surface staff-stack">
      <h2 className="staff-section__title">
        <Store size={16} aria-hidden="true" /> Profil Koperasi
      </h2>
      <p className="staff-muted" style={{ fontSize: 13 }}>
        Yang diisi di sini tampil di halaman publik {kopdes.name}.
      </p>

      <form className="staff-stack" onSubmit={save}>
        <div className="field">
          <label htmlFor="kopdes-description">Deskripsi</label>
          <textarea
            id="kopdes-description"
            name="description"
            rows={3}
            maxLength={1000}
            defaultValue={kopdes.description ?? ''}
          />
        </div>

        <div className="field">
          <label htmlFor="kopdes-phone">Telepon</label>
          <input
            id="kopdes-phone"
            name="phone"
            type="tel"
            defaultValue={kopdes.phone ?? ''}
            placeholder="08xxxxxxxxxx"
          />
        </div>

        <div className="field">
          <label htmlFor="kopdes-services">Pelayanan yang disediakan</label>
          <input
            id="kopdes-services"
            name="services"
            defaultValue={kopdes.serviceCategories.join(', ')}
            placeholder="Sembako, Pangan, Kebutuhan Harian"
          />
          <p className="staff-muted" style={{ fontSize: 12 }}>
            Pisahkan dengan koma. Maksimal 12 layanan.
          </p>
        </div>

        <fieldset className="staff-stack" style={{ border: 0, padding: 0 }}>
          <legend className="staff-section__title" style={{ fontSize: 14 }}>
            <Clock size={15} aria-hidden="true" /> Jam Operasional
          </legend>
          {DAYS.map(([key, label]) => {
            const day = kopdes.operatingHours?.[key] ?? null;
            return (
              <div key={key} className="staff-hours__row">
                <span>{label}</span>
                <input
                  type="time"
                  name={`${key}-open`}
                  defaultValue={day?.open ?? ''}
                  aria-label={`Jam buka ${label}`}
                />
                <input
                  type="time"
                  name={`${key}-close`}
                  defaultValue={day?.close ?? ''}
                  aria-label={`Jam tutup ${label}`}
                />
              </div>
            );
          })}
          <p className="staff-muted" style={{ fontSize: 12 }}>
            Hari yang dikosongkan ditampilkan sebagai tutup.
          </p>
        </fieldset>

        {error && (
          <p className="staff-muted" style={{ color: 'var(--st-primary)' }}>
            {error}
          </p>
        )}
        {notice && <p className="staff-muted">{notice}</p>}

        <button type="submit" className="staff-btn" disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan Profil'}
        </button>
      </form>
    </section>
  );
}

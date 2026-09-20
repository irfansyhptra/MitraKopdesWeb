'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import type {
  ApprovalResult,
  KopdesApplication,
  KopdesApplicationStatus,
} from '@shared/api';
import { Building2, Check, Mail, MapPin, Phone, Trash2 } from '@shared/design/icons';
import { CredentialPanel } from '@/components/super/CredentialPanel';
import {
  isPasswordValid,
  PasswordChoice,
  passwordPayload,
} from '@/components/super/PasswordChoice';

/**
 * Kotak masuk pengajuan koperasi.
 *
 * Menyetujui membuat koperasi beserta akun Admin Kopdes-nya sekaligus, dan
 * mengembalikan kata sandi awal SATU KALI. Karena itu hasilnya ditampilkan
 * sebagai panel yang harus ditutup dengan sengaja, bukan notifikasi yang
 * hilang sendiri.
 */

const TABS: { id: KopdesApplicationStatus | undefined; label: string }[] = [
  { id: 'PENDING', label: 'Menunggu' },
  { id: 'APPROVED', label: 'Disetujui' },
  { id: 'REJECTED', label: 'Ditolak' },
  { id: undefined, label: 'Semua' },
];

export default function ApplicationsPage() {
  const [tab, setTab] = useState<KopdesApplicationStatus | undefined>('PENDING');
  const [approved, setApproved] = useState<ApprovalResult | null>(null);

  const apps = useAsync<KopdesApplication[]>(
    () => api.getApplications(tab),
    [tab],
  );

  return (
    <>
      <h1 className="staff-section__title" style={{ fontSize: 20 }}>
        Pengajuan Koperasi
      </h1>
      <p style={{ fontSize: 13, color: 'var(--st-muted)', margin: '2px 0 var(--sp-md)' }}>
        Koperasi desa yang ingin bergabung mengisi formulir di{' '}
        <code>/daftar-kopdes</code>.
      </p>

      <div className="filterbar__row" role="tablist" aria-label="Filter status">
        {TABS.map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            className="kc-chip"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 'var(--sp-base)' }}>
        {apps.loading && <StaffSkeleton height={160} />}

        {!apps.loading && apps.error && (
          <StaffError message={apps.error} onRetry={apps.reload} />
        )}

        {!apps.loading && !apps.error && apps.data?.length === 0 && (
          <div className="staff-surface staff-empty">
            Tidak ada pengajuan pada filter ini.
          </div>
        )}

        {!apps.loading && !apps.error && !!apps.data?.length && (
          <div className="stack-md">
            {apps.data.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                onApproved={(result) => {
                  setApproved(result);
                  apps.reload();
                }}
                onRejected={apps.reload}
              />
            ))}
          </div>
        )}
      </div>

      {approved && (
        <CredentialPanel result={approved} onClose={() => setApproved(null)} />
      )}
    </>
  );
}

function ApplicationCard({
  app,
  onApproved,
  onRejected,
}: {
  app: KopdesApplication;
  onApproved: (r: ApprovalResult) => void;
  onRejected: () => void;
}) {
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [note, setNote] = useState('');
  const [ownPassword, setOwnPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = app.status === 'PENDING';

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      onApproved(
        await api.approveApplication(app.id, {
          latitude: Number(lat),
          longitude: Number(lng),
          ...(note.trim() ? { reviewNote: note.trim() } : {}),
          ...passwordPayload(ownPassword, password),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    setError(null);
    try {
      await api.rejectApplication(app.id, note.trim());
      onRejected();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  // Rentangnya ikut diperiksa: 95 sebagai latitude adalah kekeliruan yang
  // mudah terjadi karena tertukar dengan longitude Aceh.
  const coordsValid =
    lat.trim() !== '' &&
    lng.trim() !== '' &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    Math.abs(Number(lat)) <= 90 &&
    Math.abs(Number(lng)) <= 180;

  const canApprove = coordsValid && isPasswordValid(ownPassword, password);

  return (
    <div className="staff-surface stack-md">
      <div style={{ display: 'flex', gap: 'var(--sp-md)', alignItems: 'flex-start' }}>
        <span className="staff-order__thumb">
          <Building2 size={20} aria-hidden="true" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--st-ink)' }}>
            {app.kopdesName}
          </p>
          <p className="staff-order__meta">
            <MapPin size={12} aria-hidden="true" /> {app.village}, {app.district},{' '}
            {app.city}, {app.province}
          </p>
        </div>
        <StatusChip status={app.status} />
      </div>

      {app.description && (
        <p style={{ fontSize: 13, color: 'var(--st-muted)' }}>{app.description}</p>
      )}

      <div className="staff-surface" style={{ background: 'var(--st-bg)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--st-muted)', marginBottom: 4 }}>
          Pengurus — akan menjadi Admin Kopdes
        </p>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--st-ink)' }}>
          {app.contactName}
        </p>
        <p className="staff-order__meta">
          <Mail size={12} aria-hidden="true" /> {app.contactEmail}
        </p>
        <p className="staff-order__meta">
          <Phone size={12} aria-hidden="true" /> {app.contactPhone}
        </p>
      </div>

      {app.notes && (
        <p style={{ fontSize: 13, color: 'var(--st-muted)' }}>
          <strong>Catatan pemohon:</strong> {app.notes}
        </p>
      )}

      {app.reviewNote && !pending && (
        <p style={{ fontSize: 13, color: 'var(--st-muted)' }}>
          <strong>Catatan tinjauan:</strong> {app.reviewNote}
        </p>
      )}

      {error && <p className="form-error">{error}</p>}

      {pending && mode === 'idle' && (
        <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
          <button type="button" className="staff-btn" style={{ width: 'auto' }} onClick={() => setMode('approve')}>
            <Check size={15} aria-hidden="true" /> Setujui
          </button>
          <button
            type="button"
            className="staff-btn staff-btn--ghost"
            style={{ width: 'auto' }}
            onClick={() => setMode('reject')}
          >
            <Trash2 size={15} aria-hidden="true" /> Tolak
          </button>
        </div>
      )}

      {pending && mode === 'approve' && (
        <div className="stack-md">
          {/* Koordinat ditanyakan di sini, bukan di formulir publik: pengurus
              desa sering tidak tahu titiknya, dan tanpa koordinat koperasinya
              tidak akan pernah muncul di pencarian terdekat. */}
          <p style={{ fontSize: 12.5, color: 'var(--st-muted)' }}>
            Isi koordinat koperasi. Tanpa ini ia tidak akan muncul di pencarian
            terdekat pelanggan.
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: 1, minWidth: 140 }}>
              <label htmlFor={`lat-${app.id}`}>Latitude</label>
              <input
                id={`lat-${app.id}`}
                inputMode="decimal"
                placeholder="5.5483"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 140 }}>
              <label htmlFor={`lng-${app.id}`}>Longitude</label>
              <input
                id={`lng-${app.id}`}
                inputMode="decimal"
                placeholder="95.3238"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor={`note-${app.id}`}>Catatan (opsional)</label>
            <input
              id={`note-${app.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <PasswordChoice
            idPrefix={`app-${app.id}`}
            own={ownPassword}
            value={password}
            onOwnChange={setOwnPassword}
            onValueChange={setPassword}
          />
          <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
            <button
              type="button"
              className="staff-btn"
              style={{ width: 'auto' }}
              disabled={!canApprove || busy}
              onClick={() => void approve()}
            >
              {busy ? 'Membuat akun…' : 'Buat Koperasi & Akun'}
            </button>
            <button
              type="button"
              className="staff-btn staff-btn--ghost"
              style={{ width: 'auto' }}
              onClick={() => setMode('idle')}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {pending && mode === 'reject' && (
        <div className="stack-md">
          <div className="field">
            <label htmlFor={`rej-${app.id}`}>Alasan penolakan (wajib)</label>
            <input
              id={`rej-${app.id}`}
              value={note}
              placeholder="mis. data alamat belum lengkap"
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="t-caption-sm">
              Pemohon boleh mengajukan lagi setelah melengkapi datanya.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
            <button
              type="button"
              className="staff-btn"
              style={{ width: 'auto' }}
              disabled={note.trim().length === 0 || busy}
              onClick={() => void reject()}
            >
              {busy ? 'Menolak…' : 'Tolak Pengajuan'}
            </button>
            <button
              type="button"
              className="staff-btn staff-btn--ghost"
              style={{ width: 'auto' }}
              onClick={() => setMode('idle')}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: KopdesApplicationStatus }) {
  const view = {
    PENDING: { label: 'Menunggu', color: 'var(--st-warning)' },
    APPROVED: { label: 'Disetujui', color: 'var(--st-success)' },
    REJECTED: { label: 'Ditolak', color: 'var(--st-primary)' },
  }[status];

  return (
    <span
      className="staff-chip"
      style={{
        ['--chip-fg' as string]: view.color,
        ['--chip-bg' as string]: `color-mix(in srgb, ${view.color} 12%, #fff)`,
      }}
    >
      {view.label}
    </span>
  );
}

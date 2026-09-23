'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useStaff } from '@/components/staff/StaffContext';
import { useAsync } from '@/components/staff/useAsync';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import { Permissions } from '@shared/api';
import type { Membership, MembershipStatus } from '@shared/api';
import { Check, Lock, UsersRound, X } from '@shared/design/icons';

/**
 * Verifikasi pendaftaran anggota koperasi.
 *
 * Alurnya sama dengan verifikasi Mitra UMKM: warga mendaftar lewat halaman
 * Kopdes, pengurus yang memutuskan. Daftar ini selalu terbatas pada koperasi
 * si pemegang akun — lingkupnya ditentukan server dari token, bukan dari
 * parameter yang dikirim halaman ini.
 */

const TABS: { id: MembershipStatus; label: string }[] = [
  { id: 'PENDING', label: 'Menunggu' },
  { id: 'ACTIVE', label: 'Anggota' },
  { id: 'REJECTED', label: 'Ditolak' },
];

export default function StaffMembersPage() {
  const { can } = useStaff();
  const allowed = can(Permissions.memberManage);

  const [tab, setTab] = useState<MembershipStatus>('PENDING');
  const [busy, setBusy] = useState<string | null>(null);

  const members = useAsync<Membership[]>(
    () => (allowed ? api.getMembers(tab) : Promise.resolve([])),
    [allowed, tab],
  );

  if (!allowed) {
    return (
      <div className="staff-surface" style={{ marginTop: 'var(--sp-lg)' }}>
        <p className="staff-section__title">Akses terbatas</p>
        <p style={{ fontSize: 13, color: 'var(--st-muted)', marginTop: 'var(--sp-sm)' }}>
          <Lock size={13} aria-hidden="true" /> Memverifikasi anggota adalah
          wewenang Admin Kopdes. Hubungi pengurus koperasi Anda.
        </p>
      </div>
    );
  }

  async function review(id: string, status: 'ACTIVE' | 'REJECTED') {
    // Ketukan ganda pada permintaan yang sama akan ditolak server ("sudah
    // pernah diputuskan"), tetapi menahannya di sini menghindari pesan galat
    // yang membingungkan.
    if (busy) return;
    setBusy(id);
    try {
      const note =
        status === 'REJECTED'
          ? window.prompt('Alasan penolakan (dibaca pemohon):')?.trim()
          : undefined;
      // Penolakan tanpa alasan dibiarkan lewat: memaksa pengurus mengetik
      // sesuatu hanya melahirkan alasan "-".
      await api.reviewMembership(id, status, note || undefined);
      members.reload();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div style={{ marginBottom: 'var(--sp-md)' }}>
        <h1 className="staff-section__title" style={{ fontSize: 20 }}>
          Anggota Koperasi
        </h1>
        <p style={{ fontSize: 13, color: 'var(--st-muted)', marginTop: 2 }}>
          Warga yang mendaftar lewat halaman Kopdes. Terima setelah Anda yakin
          pemohonnya warga desa ini.
        </p>
      </div>

      <div className="staff-segments" role="group" aria-label="Status anggota">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {members.loading && (
        <div className="staff-surface staff-surface--flush">
          {[0, 1].map((i) => (
            <div className="staff-order" key={i}>
              <StaffSkeleton height={44} width={44} radius={12} />
              <div className="staff-order__body">
                <StaffSkeleton height={13} width="40%" />
                <div style={{ height: 6 }} />
                <StaffSkeleton height={12} width="65%" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!members.loading && members.error && (
        <StaffError message={members.error} onRetry={members.reload} />
      )}

      {!members.loading && !members.error && members.data?.length === 0 && (
        <div className="staff-surface staff-empty">
          {tab === 'PENDING'
            ? 'Tidak ada pendaftaran yang menunggu.'
            : tab === 'ACTIVE'
              ? 'Belum ada anggota aktif.'
              : 'Belum ada pendaftaran yang ditolak.'}
        </div>
      )}

      {!members.loading && !members.error && !!members.data?.length && (
        <div className="staff-surface staff-surface--flush">
          {members.data.map((member) => (
            <div className="staff-order" key={member.id}>
              <span className="staff-feature-icon" aria-hidden="true">
                <UsersRound size={18} />
              </span>
              <div className="staff-order__body">
                <p className="staff-order__customer">{member.fullName}</p>
                <p className="staff-order__meta">
                  {member.phone} · {member.address}
                </p>
                {member.note && (
                  <p className="staff-order__meta">Catatan: {member.note}</p>
                )}
                {member.status !== 'PENDING' && member.reviewNote && (
                  <p className="staff-order__meta">
                    Keputusan: {member.reviewNote}
                  </p>
                )}

                {member.status === 'PENDING' && (
                  <div className="staff-actions" style={{ marginTop: 'var(--sp-sm)' }}>
                    <button
                      type="button"
                      className="staff-btn staff-btn--ghost"
                      disabled={busy === member.id}
                      onClick={() => void review(member.id, 'REJECTED')}
                      aria-label={`Tolak pendaftaran ${member.fullName}`}
                    >
                      <X size={15} aria-hidden="true" /> Tolak
                    </button>
                    <button
                      type="button"
                      className="staff-btn"
                      disabled={busy === member.id}
                      onClick={() => void review(member.id, 'ACTIVE')}
                      aria-label={`Terima ${member.fullName} sebagai anggota`}
                    >
                      <Check size={15} aria-hidden="true" /> Terima
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

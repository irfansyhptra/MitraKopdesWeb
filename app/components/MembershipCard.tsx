'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Badge, Button, Card } from '@shared/design/ui';
import { BadgeCheck, Clock, CircleSlash, UsersRound } from '@shared/design/icons';
import type { Membership } from '@shared/api';

/**
 * Pendaftaran anggota koperasi desa.
 *
 * Statusnya ikut alur verifikasi Mitra UMKM: warga mengajukan, pengurus yang
 * memutuskan. Tidak ada jalur "langsung aktif" — keanggotaan menentukan siapa
 * yang berhak atas layanan anggota.
 *
 * Yang ditanyakan hanya nama, telepon, dan alamat. NIK sengaja tidak diminta:
 * pengurus desa mengenal warganya, sementara menyimpan nomor identitas
 * nasional menambah kewajiban perlindungan data yang tidak sebanding.
 */
export function MembershipCard({
  kopdesId,
  kopdesName,
  memberCount,
}: {
  kopdesId: string;
  kopdesName: string;
  /** Tidak terdefinisi bila backend belum mengirimkannya — bukan nol. */
  memberCount?: number;
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    api
      .getMembership(kopdesId)
      .then((m) => {
        if (!cancelled) setMembership(m);
      })
      // Gagal membaca status bukan alasan menyembunyikan formulirnya;
      // pengajuan ganda tetap ditolak server lewat unique(userId, kopdesId).
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kopdesId]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    const form = new FormData(e.currentTarget);
    const payload = {
      fullName: String(form.get('fullName') ?? '').trim(),
      phone: String(form.get('phone') ?? '').trim(),
      address: String(form.get('address') ?? '').trim(),
      note: String(form.get('note') ?? '').trim() || undefined,
    };

    setSubmitting(true);
    setError(null);
    try {
      const saved = await api.applyMembership(kopdesId, payload);
      setMembership(saved);
      setFormOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="stack-md">
      <div className="kc-member__head">
        <span className="kc-member__icon" aria-hidden="true">
          <UsersRound size={20} />
        </span>
        <div>
          <h2 className="kc-member__title">Keanggotaan {kopdesName}</h2>
          <p className="kc-member__sub">
            {memberCount === undefined
              ? 'Daftar untuk menikmati layanan anggota koperasi desa.'
              : memberCount > 0
                ? `${memberCount} warga sudah menjadi anggota.`
                : 'Jadilah anggota pertama koperasi desa ini.'}
          </p>
        </div>
      </div>

      {loading && <p className="kc-member__sub">Memeriksa status…</p>}

      {!loading && signedIn === false && (
        <>
          <p className="kc-member__sub">
            Pendaftaran anggota melekat pada akun Anda, jadi masuk dulu sebelum
            mendaftar.
          </p>
          <Link href="/login" className="kc-btn kc-btn--primary kc-btn--block">
            Masuk untuk Mendaftar
          </Link>
        </>
      )}

      {!loading && signedIn && membership?.status === 'ACTIVE' && (
        <div className="kc-member__state">
          <Badge variant="success">
            <BadgeCheck size={13} aria-hidden="true" /> Anggota aktif
          </Badge>
          <p className="kc-member__sub">
            Anda terdaftar atas nama {membership.fullName}.
            {membership.reviewNote ? ` Catatan pengurus: ${membership.reviewNote}` : ''}
          </p>
        </div>
      )}

      {!loading && signedIn && membership?.status === 'PENDING' && (
        <div className="kc-member__state">
          <Badge variant="warning">
            <Clock size={13} aria-hidden="true" /> Menunggu verifikasi
          </Badge>
          <p className="kc-member__sub">
            Pengurus koperasi akan menghubungi Anda di {membership.phone}.
          </p>
        </div>
      )}

      {!loading && signedIn && membership?.status === 'REJECTED' && !formOpen && (
        <div className="kc-member__state">
          <Badge variant="muted">
            <CircleSlash size={13} aria-hidden="true" /> Pendaftaran ditolak
          </Badge>
          {/* Alasannya ditampilkan apa adanya: tanpa itu pemohon tidak tahu
              apa yang harus diperbaiki sebelum mendaftar lagi. */}
          <p className="kc-member__sub">
            {membership.reviewNote || 'Pengurus belum menuliskan alasannya.'}
          </p>
          <Button variant="secondary" block onClick={() => setFormOpen(true)}>
            Perbaiki dan Daftar Lagi
          </Button>
        </div>
      )}

      {!loading && signedIn && !membership && !formOpen && (
        <Button block onClick={() => setFormOpen(true)}>
          Daftar Jadi Anggota
        </Button>
      )}

      {formOpen && (
        <form className="stack-md" onSubmit={submit}>
          <div className="field">
            <label htmlFor="member-name">Nama lengkap</label>
            <input id="member-name" name="fullName" required minLength={2} maxLength={120} />
          </div>
          <div className="field">
            <label htmlFor="member-phone">Nomor telepon / WhatsApp</label>
            <input
              id="member-phone"
              name="phone"
              type="tel"
              required
              placeholder="08xxxxxxxxxx"
            />
          </div>
          <div className="field">
            <label htmlFor="member-address">Alamat di desa ini</label>
            <input id="member-address" name="address" required minLength={5} maxLength={255} />
          </div>
          <div className="field">
            <label htmlFor="member-note">Catatan (opsional)</label>
            <input
              id="member-note"
              name="note"
              maxLength={500}
              placeholder="mis. Dusun Tengah, RT 02"
            />
          </div>

          <p className="kc-hint">
            Data ini dipakai pengurus untuk memastikan Anda warga desa yang sama.
            Nomor identitas tidak diminta.
          </p>

          {error && <p className="kc-member__error">{error}</p>}

          <div className="kc-member__acts">
            <Button
              variant="secondary"
              block
              onClick={() => {
                setFormOpen(false);
                setError(null);
              }}
            >
              Batal
            </Button>
            <Button type="submit" block disabled={submitting}>
              {submitting ? 'Mengirim…' : 'Kirim Pendaftaran'}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

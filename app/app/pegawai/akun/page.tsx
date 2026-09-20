'use client';

import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useStaff } from '@/components/staff/StaffContext';
import { useAsync } from '@/components/staff/useAsync';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import { Permissions } from '@shared/api';
import type {
  PermissionCatalog,
  PermissionInfo,
  StaffAccount,
} from '@shared/api';
import { Lock, Plus, Trash2, UserIcon } from '@shared/design/icons';

/**
 * Akun Pegawai — panel pemilik Kopdes.
 *
 * Admin Kopdes mengangkat pegawainya sendiri dan menentukan bagian portal
 * mana yang terbuka untuk tiap orang. Yang diatur di sini adalah izin, bukan
 * daftar halaman: satu halaman bisa membutuhkan lebih dari satu izin, dan
 * backend memutuskan berdasarkan izin. Mengatur "halaman" lalu menerjemahkannya
 * jadi izin di klien akan membuat dua daftar yang pelan-pelan berbeda.
 *
 * Seluruh penolakan tetap dikerjakan server. Panel ini hanya menyusun
 * permintaannya.
 */

export default function StaffAccountsPage() {
  const { can } = useStaff();
  const allowed = can(Permissions.staffManage);

  const accounts = useAsync<StaffAccount[]>(
    () => (allowed ? api.getStaffAccounts() : Promise.resolve([])),
    [allowed],
  );
  const catalog = useAsync<PermissionCatalog | null>(
    () => (allowed ? api.getPermissionCatalog() : Promise.resolve(null)),
    [allowed],
  );

  const [editing, setEditing] = useState<StaffAccount | null>(null);
  const [creating, setCreating] = useState(false);

  if (!allowed) {
    return (
      <div className="staff-surface" style={{ marginTop: 'var(--sp-lg)' }}>
        <p className="staff-section__title">Akses terbatas</p>
        <p style={{ fontSize: 13, color: 'var(--st-muted)', marginTop: 'var(--sp-sm)' }}>
          <Lock size={13} aria-hidden="true" /> Mengelola akun pegawai adalah
          wewenang Admin Kopdes. Hubungi pengurus koperasi Anda.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--sp-md)',
          flexWrap: 'wrap',
          marginBottom: 'var(--sp-md)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="staff-section__title" style={{ fontSize: 20 }}>
            Akun Pegawai
          </h1>
          <p style={{ fontSize: 13, color: 'var(--st-muted)', marginTop: 2 }}>
            Angkat pegawai koperasi dan tentukan bagian portal yang terbuka
            untuk tiap orang.
          </p>
        </div>
        <button
          type="button"
          className="staff-btn"
          style={{ width: 'auto' }}
          onClick={() => setCreating(true)}
        >
          <Plus size={15} aria-hidden="true" /> Tambah Pegawai
        </button>
      </div>

      {accounts.loading && (
        <div className="staff-surface staff-surface--flush">
          {[0, 1, 2].map((i) => (
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

      {!accounts.loading && accounts.error && (
        <StaffError message={accounts.error} onRetry={accounts.reload} />
      )}

      {!accounts.loading && !accounts.error && accounts.data?.length === 0 && (
        <div className="staff-surface staff-empty">
          Belum ada pegawai di koperasi ini. Tambahkan lewat tombol di atas.
        </div>
      )}

      {!accounts.loading && !accounts.error && !!accounts.data?.length && (
        <div className="staff-surface staff-surface--flush">
          {accounts.data.map((account) => (
            <AccountRow
              key={account.id}
              account={account}
              catalog={catalog.data}
              onEdit={() => setEditing(account)}
              onDeleted={accounts.reload}
            />
          ))}
        </div>
      )}

      {(creating || editing) && catalog.data && (
        <AccountDialog
          account={editing}
          catalog={catalog.data}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            accounts.reload();
          }}
        />
      )}
    </>
  );
}

function AccountRow({
  account,
  catalog,
  onEdit,
  onDeleted,
}: {
  account: StaffAccount;
  catalog: PermissionCatalog | null;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = catalog?.assignable.length ?? 0;
  const granted = account.effectivePermissions.length;

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api.deletePegawai(account.id);
      onDeleted();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="staff-order">
      <span className="staff-order__thumb">
        <UserIcon size={20} aria-hidden="true" />
      </span>

      <div className="staff-order__body">
        <p className="staff-order__customer" style={{ fontWeight: 600 }}>
          {account.name}
        </p>
        <p className="staff-order__meta">
          <span>{account.email}</span>
          {account.phone && <span>{account.phone}</span>}
        </p>
        <p className="staff-order__meta" style={{ marginTop: 4 }}>
          {/* "Akses penuh pegawai" bukan berarti setara admin — itu bawaan
              peran pegawai. Ditulis begitu supaya kolom kosong di database
              tidak terbaca sebagai "tanpa wewenang". */}
          <span
            className="staff-chip"
            style={
              account.usesRoleDefaults
                ? {
                    ['--chip-fg' as string]: 'var(--st-success)',
                    ['--chip-bg' as string]:
                      'color-mix(in srgb, var(--st-success) 12%, #fff)',
                  }
                : {
                    ['--chip-fg' as string]: 'var(--st-info)',
                    ['--chip-bg' as string]:
                      'color-mix(in srgb, var(--st-info) 12%, #fff)',
                  }
            }
          >
            {account.usesRoleDefaults
              ? 'Akses penuh pegawai'
              : `Dibatasi · ${granted} dari ${total} wewenang`}
          </span>
        </p>
        {error && (
          <p className="form-error" style={{ marginTop: 4 }}>
            {error}
          </p>
        )}
      </div>

      <div
        className="staff-order__action"
        style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}
      >
        {confirming ? (
          <>
            <button
              type="button"
              className="staff-btn"
              style={{ width: 'auto' }}
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? 'Menghapus…' : 'Ya, hapus'}
            </button>
            <button
              type="button"
              className="staff-btn staff-btn--ghost"
              style={{ width: 'auto' }}
              onClick={() => setConfirming(false)}
            >
              Batal
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="staff-btn staff-btn--ghost"
              style={{ width: 'auto' }}
              onClick={onEdit}
            >
              Atur Akses
            </button>
            {/* Menghapus akun tidak bisa dibatalkan, jadi selalu lewat
                konfirmasi — bukan dialog peramban yang gampang ditekan
                refleks. */}
            <button
              type="button"
              className="staff-btn staff-btn--ghost"
              style={{ width: 'auto' }}
              aria-label={`Hapus akun ${account.name}`}
              onClick={() => setConfirming(true)}
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AccountDialog({
  account,
  catalog,
  onClose,
  onSaved,
}: {
  account: StaffAccount | null;
  catalog: PermissionCatalog;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = account !== null;

  const [name, setName] = useState(account?.name ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [phone, setPhone] = useState(account?.phone ?? '');
  const [password, setPassword] = useState('');

  // Mode akses: "penuh" mengirim daftar kosong, yang backend artikan sebagai
  // bawaan peran. Menyimpan seluruh daftar sebagai override juga akan bekerja
  // hari ini, tetapi akun itu lalu berhenti ikut ketika bawaan peran berubah.
  const [restricted, setRestricted] = useState(
    account ? !account.usesRoleDefaults : false,
  );
  const [selected, setSelected] = useState<Set<string>>(
    new Set(account?.effectivePermissions ?? catalog.assignable),
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byGroup = new Map<string, PermissionInfo[]>();
    for (const item of catalog.items) {
      const list = byGroup.get(item.group) ?? [];
      list.push(item);
      byGroup.set(item.group, list);
    }
    return [...byGroup.entries()];
  }, [catalog]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const valid =
    name.trim().length >= 2 &&
    (isEdit || (email.trim().length > 3 && password.length >= 8)) &&
    (!password || password.length >= 8) &&
    (!restricted || selected.size > 0);

  async function submit() {
    setBusy(true);
    setError(null);
    const permissions = restricted ? [...selected] : [];
    try {
      if (isEdit) {
        await api.updatePegawai(account.id, {
          name: name.trim(),
          phone: phone.trim(),
          permissions,
          ...(password ? { password } : {}),
        });
      } else {
        await api.createPegawai({
          email: email.trim(),
          password,
          name: name.trim(),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          permissions,
        });
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? `Atur akses ${account.name}` : 'Tambah pegawai'}
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
        style={{ width: 'min(560px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--st-ink)' }}>
            {isEdit ? `Atur Akses · ${account.name}` : 'Tambah Pegawai'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--st-muted)' }}>
            Pegawai ditugaskan ke koperasi Anda secara otomatis.
          </p>
        </div>

        <div className="field">
          <label htmlFor="acc-name">Nama</label>
          <input
            id="acc-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {!isEdit && (
          <div className="field">
            <label htmlFor="acc-email">Email</label>
            <input
              id="acc-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="acc-phone">Nomor telepon (opsional)</label>
          <input
            id="acc-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="acc-pass">
            {isEdit ? 'Kata sandi baru (kosongkan bila tidak diubah)' : 'Kata sandi'}
          </label>
          <input
            id="acc-pass"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="t-caption-sm">Minimal 8 karakter.</p>
        </div>

        <fieldset style={{ border: 'none' }}>
          <legend className="staff-section__title" style={{ marginBottom: 'var(--sp-sm)' }}>
            Akses
          </legend>

          <label style={accessRowStyle}>
            <input
              type="radio"
              name="access"
              checked={!restricted}
              onChange={() => setRestricted(false)}
              style={{ accentColor: 'var(--st-primary)' }}
            />
            <span>
              <strong style={{ fontSize: 13.5, color: 'var(--st-ink)' }}>
                Pegawai penuh
              </strong>
              <span className="t-caption-sm" style={{ display: 'block' }}>
                Seluruh pekerjaan harian koperasi. Ikut menyesuaikan sendiri
                bila wewenang bawaan pegawai berubah di kemudian hari.
              </span>
            </span>
          </label>

          <label style={accessRowStyle}>
            <input
              type="radio"
              name="access"
              checked={restricted}
              onChange={() => setRestricted(true)}
              style={{ accentColor: 'var(--st-primary)' }}
            />
            <span>
              <strong style={{ fontSize: 13.5, color: 'var(--st-ink)' }}>
                Pilih sendiri
              </strong>
              <span className="t-caption-sm" style={{ display: 'block' }}>
                Tentukan satu per satu. Yang tidak dicentang akan tampil
                terkunci di portal pegawai dan ditolak server bila tetap
                dipanggil.
              </span>
            </span>
          </label>
        </fieldset>

        {restricted && (
          <div className="stack-md">
            {groups.map(([group, items]) => (
              <div key={group}>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--st-muted)',
                    marginBottom: 'var(--sp-xs)',
                  }}
                >
                  {group}
                </p>
                {items.map((item) => (
                  <label key={item.key} style={accessRowStyle}>
                    <input
                      type="checkbox"
                      checked={selected.has(item.key)}
                      onChange={() => toggle(item.key)}
                      style={{ accentColor: 'var(--st-primary)' }}
                    />
                    <span>
                      <strong style={{ fontSize: 13, color: 'var(--st-ink)' }}>
                        {item.label}
                      </strong>
                      <span className="t-caption-sm" style={{ display: 'block' }}>
                        {item.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ))}
            {selected.size === 0 && (
              <p className="form-error">
                Pilih setidaknya satu wewenang — akun tanpa wewenang sama sekali
                tidak bisa membuka apa pun.
              </p>
            )}
          </div>
        )}

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
            {busy ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Buat Akun'}
          </button>
        </div>
      </div>
    </div>
  );
}

const accessRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 'var(--sp-md)',
  alignItems: 'flex-start',
  padding: 'var(--sp-sm) 0',
  cursor: 'pointer',
};

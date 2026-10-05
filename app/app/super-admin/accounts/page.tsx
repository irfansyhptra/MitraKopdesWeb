'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import type { KopdesStats, SuperAdminUser } from '@shared/api';
import { Building2, Plus, ShieldCheck, Trash2 } from '@shared/design/icons';

export default function SuperAdminAccountsPage() {
  const accounts = useAsync<SuperAdminUser[]>(() => api.getSuperAdminAccounts());
  const kopdes = useAsync<KopdesStats[]>(() => api.getKopdesStats());
  const [creating, setCreating] = useState(false);

  return <>
    <div className="staff-page-head">
      <div><h1>Akun Kopdes</h1><p>Buat dan kelola akun Admin atau Pegawai untuk koperasi yang terdaftar.</p></div>
      <button type="button" className="staff-btn" style={{ width: 'auto' }} onClick={() => setCreating(true)}><Plus size={15} />Buat Akun</button>
    </div>

    {accounts.loading && <StaffSkeleton height={180} />}
    {!accounts.loading && accounts.error && <StaffError message={accounts.error} onRetry={accounts.reload} />}
    {!accounts.loading && !accounts.error && !accounts.data?.length && <div className="staff-surface staff-empty">Belum ada akun staf Kopdes.</div>}
    {!accounts.loading && !accounts.error && !!accounts.data?.length && <div className="staff-surface staff-surface--flush">
      {accounts.data.map((account) => <AccountRow key={account.id} account={account} kopdes={kopdes.data ?? []} onDeleted={accounts.reload} />)}
    </div>}

    {creating && <CreateAccountDialog kopdes={kopdes.data ?? []} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); accounts.reload(); }} />}
  </>;
}

function AccountRow({ account, kopdes, onDeleted }: { account: SuperAdminUser; kopdes: KopdesStats[]; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assignment = kopdes.find((item) => item.id === account.kopdesId)?.name;

  async function remove() {
    setBusy(true); setError(null);
    try { await api.deleteSuperAdminAccount(account.id); onDeleted(); }
    catch (reason) { setError((reason as Error).message); setBusy(false); }
  }

  return <div className="staff-order">
    <span className="staff-order__thumb"><ShieldCheck size={20} /></span>
    <div className="staff-order__body">
      <p className="staff-order__customer">{account.name}</p>
      <p className="staff-order__meta"><span>{account.email}</span>{account.phone && <span>{account.phone}</span>}</p>
      <p className="staff-order__meta" style={{ marginTop: 4 }}><span className="staff-chip">{account.role === 'ADMIN_KOPDES' ? 'Admin Kopdes' : 'Pegawai Kopdes'}</span>{assignment && <span><Building2 size={12} />{assignment}</span>}</p>
      {error && <p className="form-error">{error}</p>}
    </div>
    <div className="staff-order__action">
      {confirming ? <div className="staff-actions"><button type="button" className="staff-btn" disabled={busy} onClick={() => void remove()}>{busy ? 'Menghapus…' : 'Ya, hapus'}</button><button type="button" className="staff-btn staff-btn--ghost" onClick={() => setConfirming(false)}>Batal</button></div> : <button type="button" className="staff-icon-btn" aria-label={`Hapus akun ${account.name}`} onClick={() => setConfirming(true)}><Trash2 size={17} /></button>}
    </div>
  </div>;
}

function CreateAccountDialog({ kopdes, onClose, onSaved }: { kopdes: KopdesStats[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN_KOPDES' | 'PEGAWAI_KOPDES'>('ADMIN_KOPDES');
  const [kopdesId, setKopdesId] = useState(kopdes[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      await api.createSuperAdminAccount({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, password, role, kopdesId: kopdesId || undefined });
      onSaved();
    } catch (reason) { setError((reason as Error).message); setBusy(false); }
  }

  return <div className="staff-modal" role="dialog" aria-modal="true" aria-label="Buat akun Kopdes" onClick={onClose}>
    <form className="staff-surface stack-md staff-modal__panel" onSubmit={(event) => void submit(event)} onClick={(event) => event.stopPropagation()}>
      <div><h2 className="staff-section__title">Buat Akun Kopdes</h2><p className="staff-muted">Akun langsung terhubung dengan koperasi pilihannya.</p></div>
      <div className="staff-form-grid">
        <div className="field"><label htmlFor="super-name">Nama</label><input id="super-name" required minLength={2} value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div className="field"><label htmlFor="super-email">Email</label><input id="super-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
        <div className="field"><label htmlFor="super-phone">Nomor telepon</label><input id="super-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
        <div className="field"><label htmlFor="super-password">Kata sandi</label><input id="super-password" type="password" minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
        <div className="field"><label htmlFor="super-role">Peran</label><select id="super-role" value={role} onChange={(event) => setRole(event.target.value as typeof role)}><option value="ADMIN_KOPDES">Admin Kopdes</option><option value="PEGAWAI_KOPDES">Pegawai Kopdes</option></select></div>
        <div className="field"><label htmlFor="super-kopdes">Koperasi</label><select id="super-kopdes" value={kopdesId} onChange={(event) => setKopdesId(event.target.value)} required={kopdes.length > 0}>{!kopdes.length && <option value="">Belum ada koperasi</option>}{kopdes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="staff-actions"><button type="button" className="staff-btn staff-btn--ghost" onClick={onClose}>Batal</button><button className="staff-btn" disabled={busy || !kopdes.length}>{busy ? 'Menyimpan…' : 'Buat Akun'}</button></div>
    </form>
  </div>;
}

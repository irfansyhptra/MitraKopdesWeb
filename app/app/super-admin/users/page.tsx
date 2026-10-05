'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import type { Role, SuperAdminUser } from '@shared/api';
import { Search, UserIcon } from '@shared/design/icons';

const FILTERS: { label: string; value: Role | '' }[] = [
  { label: 'Semua', value: '' },
  { label: 'Pelanggan', value: 'CUSTOMER' },
  { label: 'Mitra UMKM', value: 'UMKM' },
  { label: 'Kurir', value: 'COURIER' },
  { label: 'Admin', value: 'ADMIN_KOPDES' },
  { label: 'Pegawai', value: 'PEGAWAI_KOPDES' },
];

const ROLE_LABEL: Record<Role, string> = { SUPER_ADMIN: 'Super Admin', ADMIN_KOPDES: 'Admin Kopdes', PEGAWAI_KOPDES: 'Pegawai Kopdes', CUSTOMER: 'Pelanggan', UMKM: 'Mitra UMKM', COURIER: 'Kurir' };

export default function SuperAdminUsersPage() {
  const [role, setRole] = useState<Role | ''>('');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const users = useAsync<SuperAdminUser[]>(() => api.getSuperAdminUsers({ role: role || undefined, search: search || undefined }), [role, search]);

  function submit(event: FormEvent) { event.preventDefault(); setSearch(draft.trim()); }

  return <>
    <div className="staff-page-head"><div><h1>Direktori Pengguna</h1><p>Daftar akun yang terhubung ke sistem, dengan filter peran seperti pada aplikasi.</p></div></div>
    <form className="seller-search staff-surface" onSubmit={submit}><Search size={18} /><input aria-label="Cari pengguna" placeholder="Cari nama atau email" value={draft} onChange={(event) => setDraft(event.target.value)} /><button className="staff-btn" type="submit">Cari</button></form>
    <div className="seller-filter-row" style={{ marginBlock: 'var(--sp-base)' }}>{FILTERS.map((filter) => <button type="button" key={filter.label} className="staff-chip" aria-pressed={role === filter.value} onClick={() => setRole(filter.value)}>{filter.label}</button>)}</div>

    {users.loading && <StaffSkeleton height={180} />}
    {!users.loading && users.error && <StaffError message={users.error} onRetry={users.reload} />}
    {!users.loading && !users.error && !users.data?.length && <div className="staff-surface staff-empty">Tidak ada pengguna pada filter ini.</div>}
    {!users.loading && !users.error && !!users.data?.length && <div className="staff-surface staff-surface--flush">
      {users.data.map((user) => <div className="staff-order" key={user.id}>
        <span className="staff-order__thumb"><UserIcon size={20} /></span>
        <div className="staff-order__body"><p className="staff-order__customer">{user.name}</p><p className="staff-order__meta"><span>{user.email}</span>{user.phone && <span>{user.phone}</span>}</p></div>
        <div className="staff-order__action"><span className="staff-chip">{ROLE_LABEL[user.role]}</span></div>
      </div>)}
    </div>}
  </>;
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setTokens } from '@/lib/auth';
import { Button, Card, Chip } from '@shared/design/ui';

/**
 * Daftar — padanan `RegisterScreen`.
 *
 * Hanya tiga peran yang boleh mendaftar sendiri; akun staf Kopdes dibuat
 * Super Admin. Pembatasan sesungguhnya ada di backend (`SELF_REGISTER_ROLES`),
 * pilihan di sini cuma mencerminkannya.
 */
type SelfRole = 'CUSTOMER' | 'UMKM' | 'COURIER';

const ROLES: { id: SelfRole; label: string; desc: string }[] = [
  { id: 'CUSTOMER', label: 'Pembeli', desc: 'Belanja di marketplace desa' },
  { id: 'UMKM', label: 'Mitra UMKM', desc: 'Jualan di bawah Kopdes desamu' },
  { id: 'COURIER', label: 'Kurir', desc: 'Mengantar pesanan warga' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<SelfRole>('CUSTOMER');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role,
      });
      setTokens(result.accessToken, result.refreshToken);
      router.replace('/');
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <Card className="stack-md">
        <div>
          <h1 className="page-title">Daftar</h1>
          <p className="page-sub">Satu akun untuk seluruh layanan koperasi desa.</p>
        </div>

        <div>
          <p className="t-caption-sm" style={{ marginBottom: 'var(--sp-xs)' }}>
            Daftar sebagai
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
            {ROLES.map((option) => (
              <Chip
                key={option.id}
                selected={role === option.id}
                onClick={() => setRole(option.id)}
              >
                {option.label}
              </Chip>
            ))}
          </div>
          <p className="t-caption-sm" style={{ marginTop: 'var(--sp-xs)' }}>
            {ROLES.find((r) => r.id === role)?.desc}
          </p>
        </div>

        <form onSubmit={submit} className="stack-md">
          <div className="field">
            <label htmlFor="name">Nama Lengkap</label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="phone">Nomor Telepon (opsional)</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div className="field">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
            />
            <span className="t-caption-sm">Minimal 6 karakter.</span>
          </div>

          {error && <p className="form-error">{error}</p>}

          <Button type="submit" block disabled={submitting}>
            {submitting ? 'Mendaftarkan…' : 'Daftar'}
          </Button>
        </form>

        <Link href="/login" className="kc-btn kc-btn--ghost kc-btn--block">
          Sudah punya akun? Masuk
        </Link>
      </Card>
    </div>
  );
}

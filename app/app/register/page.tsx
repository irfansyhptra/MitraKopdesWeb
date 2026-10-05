'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button, Card } from '@shared/design/ui';

/**
 * Daftar — padanan `RegisterScreen`.
 *
 * Hanya akun pembeli yang boleh mendaftar sendiri; pembatasan sesungguhnya ada
 * di backend (`SELF_REGISTER_ROLES`). Pilihan peran sempat ada di sini, dan
 * keduanya menghasilkan akun buntu: UMKM tanpa profil usaha dan tanpa
 * verifikasi Kopdes, kurir tanpa desa yang bisa menugaskannya.
 */

export default function RegisterPage() {
  const router = useRouter();
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
      const challenge = await api.register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      window.sessionStorage.setItem('kopdes_pending_email', challenge.email);
      window.sessionStorage.setItem(
        'kopdes_otp_resend_at',
        String(Date.now() + challenge.resendAfter * 1000),
      );
      router.push('/verify-email');
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
            {submitting ? 'Mengirim kode…' : 'Daftar & Verifikasi Email'}
          </Button>
        </form>

        <Link href="/login" className="kc-btn kc-btn--ghost kc-btn--block">
          Sudah punya akun? Masuk
        </Link>
      </Card>
    </div>
  );
}

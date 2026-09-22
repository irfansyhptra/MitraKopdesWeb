'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { isSignedIn, setTokens, syncSessionCookie } from '@/lib/auth';
import { Button, Card, SectionHeader } from '@shared/design/ui';

/** Masuk — padanan `LoginScreen` pada aplikasi Flutter. */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get('next') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sesi yang sudah ada langsung diteruskan.
   *
   * Middleware hanya bisa membaca cookie penanda, sementara tokennya tinggal
   * di localStorage. Siapa pun yang masuk sebelum penanda itu ada — atau
   * yang cookie-nya kedaluwarsa lebih dulu — akan dilempar ke halaman ini
   * padahal sesinya masih hidup, lalu terdiam di formulir masuk tanpa tahu
   * kenapa. `syncSessionCookie` menanam ulang penandanya, dan ia dikirim
   * kembali ke tujuan semula.
   */
  useEffect(() => {
    syncSessionCookie();
    if (isSignedIn()) router.replace(next);
  }, [next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.login(email.trim(), password);
      setTokens(result.accessToken, result.refreshToken);
      // Peran staf punya portalnya sendiri; mengarahkan pegawai ke etalase
      // pelanggan membuatnya harus mencari jalan sendiri ke tempat kerjanya.
      const home = landingFor(result.user.role);
      router.replace(next !== '/' ? next : home);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <Card className="stack-md">
        <div>
          <h1 className="page-title">Masuk</h1>
          <p className="page-sub">Belanja dan pantau pesananmu di KMP Mitra.</p>
        </div>

        <form onSubmit={submit} className="stack-md">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <Button type="submit" block disabled={submitting}>
            {submitting ? 'Memproses…' : 'Masuk'}
          </Button>
        </form>

        <SectionHeader title="Belum punya akun?" />
        <Link href="/register" className="kc-btn kc-btn--secondary kc-btn--block">
          Daftar Sekarang
        </Link>
      </Card>
    </div>
  );
}

function landingFor(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin';
    case 'ADMIN_KOPDES':
    case 'PEGAWAI_KOPDES':
      return '/pegawai';
    default:
      return '/';
  }
}

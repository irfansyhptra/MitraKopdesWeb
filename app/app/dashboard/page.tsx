'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, clearTokens } from '@/lib/auth';
import type { User } from '@shared/api';

// Dashboard pengguna (dilindungi). Menampilkan profil dari /auth/me.
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api
      .me()
      .then(setUser)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [router]);

  function logout() {
    clearTokens();
    router.push('/login');
  }

  if (loading) return <div className="state">Memuat…</div>;
  if (error)
    return (
      <div className="state">
        Sesi tidak valid.
        <br />
        <span className="muted">{error}</span>
        <br />
        <br />
        <button className="btn" style={{ maxWidth: 200 }} onClick={logout}>
          Masuk ulang
        </button>
      </div>
    );

  return (
    <div className="card">
      <h1>Dashboard</h1>
      <p className="muted">Selamat datang kembali,</p>
      <h2 style={{ color: 'var(--ink)', margin: '4px 0 20px' }}>
        {user?.name}
      </h2>
      <div className="field">
        <label>Email</label>
        <div>{user?.email}</div>
      </div>
      <div className="field">
        <label>Peran</label>
        <div>{user?.role}</div>
      </div>
      <button className="btn" onClick={logout} style={{ marginTop: 12 }}>
        Keluar
      </button>
    </div>
  );
}

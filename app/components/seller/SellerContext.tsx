'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import type { SellerStore, User } from '@shared/api';

interface SellerState {
  user: User;
  store: SellerStore;
  reload: () => void;
}

const SellerContext = createContext<SellerState | null>(null);

export function useSeller(): SellerState {
  const value = useContext(SellerContext);
  if (!value) throw new Error('useSeller dipakai di luar SellerGate');
  return value;
}

export function SellerGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<Omit<SellerState, 'reload'> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [user, store] = await Promise.all([api.me(), api.getSellerProfile()]);
      if (user.role !== 'UMKM') {
        setDenied(true);
        return;
      }
      setState({ user, store });
    } catch (reason) {
      setError((reason as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/umkm');
      return;
    }
    void load();
  }, [load, router]);

  if (denied || error) {
    return <div className="staff"><main className="staff__body">
      <div className="staff-error" style={{ marginTop: 'var(--sp-xl)' }}>
        <strong>{denied ? 'Portal ini untuk pemilik UMKM' : 'Portal belum berhasil dimuat'}</strong>
        <p>{denied ? 'Akun Anda tidak terdaftar sebagai penjual UMKM.' : error}</p>
        {denied
          ? <a className="staff-btn" href="/">Kembali ke Beranda</a>
          : <button className="staff-btn" type="button" onClick={() => void load()}>Coba Lagi</button>}
      </div>
    </main></div>;
  }

  if (!state) {
    return <div className="staff"><main className="staff__body" role="status">
      <div className="staff-skeleton" style={{ height: 180 }} />
    </main></div>;
  }

  return <SellerContext.Provider value={{ ...state, reload: () => void load() }}>
    {children}
  </SellerContext.Provider>;
}

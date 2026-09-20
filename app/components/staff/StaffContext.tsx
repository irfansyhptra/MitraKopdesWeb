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
import { StaffSkeleton } from './Section';
import type { StoreStatus, User } from '@shared/api';

/**
 * Konteks portal pegawai: siapa yang masuk, dan apa yang boleh dilakukannya.
 *
 * Izin diambil dari `GET /admin/dashboard/me`, **bukan** disimpulkan dari
 * peran. Backend yang berwenang menentukannya, dan `PEGAWAI_KOPDES` sengaja
 * tidak otomatis mewarisi seluruh wewenang `ADMIN_KOPDES` — tiap akun bisa
 * dipersempit lebih jauh lagi lewat `permissions`. Yang dilakukan `can()` di
 * sini hanya menyembunyikan tombol yang memang akan ditolak; penolakan
 * sesungguhnya tetap dilakukan `PermissionsGuard` di server.
 */

interface StaffState {
  user: User | null;
  role: string | null;
  permissions: string[];
  store: StoreStatus | null;
  /** Status toko belum terbaca — beda dari "tidak ada jadwal". */
  storeUnknown: boolean;
  can: (permission: string) => boolean;
  reload: () => void;
}

const StaffCtx = createContext<StaffState | null>(null);

export function useStaff(): StaffState {
  const ctx = useContext(StaffCtx);
  if (!ctx) throw new Error('useStaff dipakai di luar StaffGate');
  return ctx;
}

const STAFF_ROLES = ['PEGAWAI_KOPDES', 'ADMIN_KOPDES', 'SUPER_ADMIN'];

export function StaffGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<{
    user: User | null;
    role: string | null;
    permissions: string[];
  } | null>(null);
  const [store, setStore] = useState<StoreStatus | null>(null);
  const [storeUnknown, setStoreUnknown] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [me, access] = await Promise.all([
        api.me(),
        api.getStaffPermissions(),
      ]);
      if (!STAFF_ROLES.includes(access.role)) {
        setDenied(true);
        return;
      }
      setState({ user: me, role: access.role, permissions: access.permissions });
    } catch (e) {
      setError((e as Error).message);
    }

    // Status toko dimuat terpisah: kegagalannya tidak boleh menutup portal,
    // dan null berarti "jadwal belum diatur", bukan "tutup".
    try {
      setStore(await api.getStaffStoreStatus());
      setStoreUnknown(false);
    } catch {
      setStoreUnknown(true);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/pegawai');
      return;
    }
    void load();
  }, [load, router]);

  const can = useCallback(
    (permission: string) => state?.permissions.includes(permission) ?? false,
    [state],
  );

  if (denied) {
    return (
      <div className="staff">
        <div className="staff__body">
          <div className="staff-error" style={{ marginTop: 'var(--sp-xl)' }}>
            <strong style={{ color: 'var(--st-ink)', fontSize: 15 }}>
              Portal ini untuk staf Kopdes
            </strong>
            <p>
              Akun Anda tidak terdaftar sebagai pegawai atau admin koperasi.
              Hubungi Admin Kopdes bila ini keliru.
            </p>
            <a href="/" className="staff-btn" style={{ width: 'auto', lineHeight: '36px' }}>
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="staff">
        <div className="staff__body">
          <div className="staff-error" style={{ marginTop: 'var(--sp-xl)' }}>
            <strong style={{ color: 'var(--st-ink)', fontSize: 15 }}>
              Portal belum berhasil dimuat
            </strong>
            <p>{error}</p>
            <button type="button" className="staff-btn" style={{ width: 'auto' }} onClick={() => void load()}>
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state) {
    return <div className="staff"><div className="staff__body staff-stack" role="status" aria-label="Memuat akun pegawai">
      <StaffSkeleton height={180} /><StaffSkeleton height={100} /><StaffSkeleton height={200} />
    </div></div>;
  }

  return (
    <StaffCtx.Provider
      value={{
        user: state?.user ?? null,
        role: state?.role ?? null,
        permissions: state?.permissions ?? [],
        store,
        storeUnknown,
        can,
        reload: () => void load(),
      }}
    >
      {children}
    </StaffCtx.Provider>
  );
}

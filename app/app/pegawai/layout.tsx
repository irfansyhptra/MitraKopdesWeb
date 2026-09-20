import type { ReactNode } from 'react';
import { StaffGate } from '@/components/staff/StaffContext';
import { StaffShell } from '@/components/staff/StaffShell';

/**
 * Semua rute `/pegawai/*` melewati gerbang yang sama: token, peran staf, dan
 * daftar izin dari `GET /admin/dashboard/me`. Menaruhnya di layout berarti
 * tidak ada halaman baru yang bisa lupa memasangnya.
 */
export default function PegawaiLayout({ children }: { children: ReactNode }) {
  return (
    <StaffGate>
      <StaffShell>{children}</StaffShell>
    </StaffGate>
  );
}

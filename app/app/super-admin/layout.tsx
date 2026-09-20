import type { ReactNode } from 'react';
import { SuperGate } from '@/components/super/SuperContext';

/**
 * Semua rute `/super-admin/*` lewat satu gerbang, supaya tidak ada halaman
 * baru yang bisa lupa memasangnya.
 */
export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <SuperGate>{children}</SuperGate>;
}

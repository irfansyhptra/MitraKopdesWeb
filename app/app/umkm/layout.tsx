import type { ReactNode } from 'react';
import { SellerGate } from '@/components/seller/SellerContext';
import { SellerShell } from '@/components/seller/SellerShell';

export default function UmkmLayout({ children }: { children: ReactNode }) {
  return <SellerGate><SellerShell>{children}</SellerShell></SellerGate>;
}

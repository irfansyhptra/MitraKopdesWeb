import type { ReactNode } from 'react';
import { CourierGate } from '@/components/courier/CourierGate';

export default function CourierLayout({ children }: { children: ReactNode }) {
  return <CourierGate>{children}</CourierGate>;
}

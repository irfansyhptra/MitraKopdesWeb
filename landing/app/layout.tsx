import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KOPDES — Koperasi Desa Digital Berbasis AI',
  description:
    'Ekosistem digital koperasi desa: marketplace UMKM lokal, logistik andal, dan pengambilan keputusan berbasis AI.',
  keywords: ['koperasi desa', 'UMKM', 'marketplace desa', 'KOPDES'],
  openGraph: {
    title: 'KOPDES — Koperasi Desa Digital',
    description:
      'Marketplace UMKM lokal, logistik andal, dan analitik berbasis AI untuk koperasi desa.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

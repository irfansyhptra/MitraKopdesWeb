import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'KMP Mitra — Marketplace Koperasi Desa',
  description:
    'Belanja produk Kopdes dan Mitra UMKM desa, kelola pesanan dan akun Anda.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Pengguna tetap boleh memperbesar halaman — sama dengan aturan
  // aksesibilitas di aplikasi mobile: skala teks tidak pernah dimatikan.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

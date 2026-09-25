import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { AppShell } from '@/components/AppShell';
import './globals.css';

/**
 * Font merek, disajikan sendiri oleh Next.
 *
 * Sebelum ini `font-family` menyebut 'Plus Jakarta Sans' tetapi tidak ada satu
 * pun `@font-face` maupun tautan yang memuatnya — `document.fonts` kosong dan
 * seluruh situs sebenarnya tampil dengan system-ui. Lewat `next/font`, berkas
 * fontnya ikut di-host sendiri (tidak ada permintaan ke domain Google), dan
 * Next menghitung `size-adjust`/`ascent-override` untuk font cadangannya
 * sehingga pertukaran font tidak menggeser tata letak.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-brand',
});

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
    <html lang="id" className={jakarta.variable}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

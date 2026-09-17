import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'KOPDES — Marketplace & Dashboard',
  description: 'Belanja produk koperasi & UMKM desa dan kelola akun Anda.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            KOP<span>DES</span>
          </Link>
          <nav className="topnav">
            <Link href="/">Marketplace</Link>
            <Link href="/orders">Pesanan</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/cart">🛒 Keranjang</Link>
            <Link href="/login" className="btn-sm">
              Masuk
            </Link>
          </nav>
        </header>
        <main className="main">{children}</main>
      </body>
    </html>
  );
}

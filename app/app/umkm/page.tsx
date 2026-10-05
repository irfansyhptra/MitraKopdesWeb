'use client';

import Link from 'next/link';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { StaffError, StaffSection, StaffSkeleton } from '@/components/staff/Section';
import { formatRupiah } from '@shared/format';
import {
  Package,
  PackagePlus,
  ReceiptText,
  ShoppingBag,
  Star,
  TriangleAlert,
  Wallet2,
  type LucideIcon,
} from '@shared/design/icons';

export default function SellerDashboardPage() {
  const dashboard = useAsync(() => api.getSellerDashboard());

  if (dashboard.loading) return <div className="staff-stack">
    <StaffSkeleton height={150} /><StaffSkeleton height={210} /><StaffSkeleton height={160} />
  </div>;
  if (dashboard.error || !dashboard.data) {
    return <StaffError message={dashboard.error ?? 'Ringkasan toko belum berhasil dimuat'} onRetry={dashboard.reload} />;
  }

  const data = dashboard.data;
  const cards: Array<{ label: string; value: string; note: string; icon: LucideIcon; color: string }> = [
    { label: 'Pendapatan Hari Ini', value: formatRupiah(data.stats.todayEarnings), note: `${data.stats.todayOrders} transaksi`, icon: Wallet2, color: 'var(--st-primary)' },
    { label: 'Pendapatan Bulan Ini', value: formatRupiah(data.stats.monthlyEarnings), note: `${data.stats.monthlyOrders} transaksi`, icon: Wallet2, color: 'var(--st-success)' },
    { label: 'Total Produk', value: String(data.stats.totalProducts), note: `${data.stats.lowStockCount} perlu restok`, icon: Package, color: 'var(--st-info)' },
    { label: 'Pesanan Baru', value: String(data.stats.newOrdersCount), note: `${data.stats.totalOrders} seluruh pesanan`, icon: ReceiptText, color: 'var(--st-warning)' },
    { label: 'Total Terjual', value: String(data.stats.productsSold), note: 'Produk selesai dikirim', icon: ShoppingBag, color: 'var(--st-purple)' },
    { label: 'Rating Toko', value: data.stats.storeRating ? data.stats.storeRating.toFixed(1) : '—', note: data.stats.storeRating ? 'Penilaian pelanggan' : 'Belum ada ulasan', icon: Star, color: '#c08a2e' },
  ];

  return <>
    <section className="seller-revenue staff-surface">
      <div><p className="staff-muted">Pendapatan hari ini</p><strong>{formatRupiah(data.stats.todayEarnings)}</strong><span>{data.stats.todayOrders} transaksi</span></div>
      <div><p className="staff-muted">Bulan ini</p><strong>{formatRupiah(data.stats.monthlyEarnings)}</strong><span>{data.stats.monthlyOrders} transaksi</span></div>
    </section>

    <StaffSection title="Ringkasan Toko">
      <div className="seller-stat-grid">
        {cards.map((card) => <article className="staff-surface seller-stat" key={card.label}>
          <span className="staff-feature-icon" style={{ color: card.color }}><card.icon size={19} /></span>
          <strong>{card.value}</strong><span>{card.label}</span><small>{card.note}</small>
        </article>)}
      </div>
    </StaffSection>

    <StaffSection title="Fitur Penjualan Utama">
      <div className="staff-quick seller-actions">
        <Link href="/umkm/products/new" className="staff-tile"><PackagePlus size={24} />Jual Produk Baru</Link>
        <Link href="/umkm/products" className="staff-tile"><Package size={24} />Katalog Produk</Link>
        <Link href="/umkm/orders" className="staff-tile"><ReceiptText size={24} />Pesanan Masuk</Link>
        <Link href="/umkm/products?stock=low" className="staff-tile"><TriangleAlert size={24} />Stok &amp; Inventaris</Link>
      </div>
    </StaffSection>

    {!!data.lowStockProducts.length && <StaffSection title="Produk Perlu Restok" actionLabel="Lihat Produk" href="/umkm/products?stock=low">
      <div className="staff-surface staff-surface--flush">
        {data.lowStockProducts.map((product) => <Link href={`/umkm/products/${product.id}`} className="staff-order" key={product.id}>
          <span className="staff-order__thumb"><TriangleAlert size={20} /></span>
          <span className="staff-order__body"><strong>{product.name}</strong><small className="staff-order__meta">Sisa {product.stock} · {product.category?.name ?? 'Tanpa kategori'}</small></span>
          <span className="staff-chip">{product.stock <= 0 ? 'Habis' : 'Menipis'}</span>
        </Link>)}
      </div>
    </StaffSection>}

    {!!data.recentActivities.length && <StaffSection title="Aktivitas Terbaru Toko">
      <div className="staff-surface staff-surface--flush">
        {data.recentActivities.map((activity, index) => <div className="staff-order" key={`${activity.timestamp}-${index}`}>
          <span className="staff-order__thumb">{activity.type === 'ORDER' ? <ReceiptText size={19} /> : activity.type === 'REVIEW' ? <Star size={19} /> : <TriangleAlert size={19} />}</span>
          <div className="staff-order__body"><strong>{activity.title}</strong><p className="staff-order__meta">{activity.description}</p><time className="staff-order__meta">{new Date(activity.timestamp).toLocaleString('id-ID')}</time></div>
        </div>)}
      </div>
    </StaffSection>}
  </>;
}

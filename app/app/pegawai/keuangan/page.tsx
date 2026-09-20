'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useStaff } from '@/components/staff/StaffContext';
import { useAsync } from '@/components/staff/useAsync';
import { StaffAccess, StaffPageHeader } from '@/components/staff/StaffPage';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import { Permissions } from '@shared/api';
import { formatRupiah, toRupiah } from '@shared/format';
import { Wallet2 } from '@shared/design/icons';

export default function FinancePage() {
  return <StaffAccess permission={Permissions.financeReadSummary}><Report /></StaffAccess>;
}

function Report() {
  const { can } = useStaff();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const report = useAsync(() => api.getStaffFinance(period), [period]);
  const data = report.data;
  const rows = data ? [
    ['Pembayaran QRIS', data.qrisTotal], ['Pembayaran COD', data.codTotal],
    ['Refund', data.refundTotal], ['Diskon', data.discountTotal], ['Ongkir', data.shippingTotal],
  ] : [];
  return <>
    <StaffPageHeader title="Laporan Keuangan" description="Ringkasan penjualan koperasi" onRefresh={report.reload} />
    <div className="staff-segments" aria-label="Periode laporan">
      {([['today', 'Harian'], ['week', 'Mingguan'], ['month', 'Bulanan']] as const).map(([id, label]) =>
        <button key={id} type="button" aria-pressed={period === id} onClick={() => setPeriod(id)}>{label}</button>)}
    </div>
    <div className="staff-stack">
      {report.loading ? <StaffSkeleton height={240} /> : report.error ? <StaffError message={report.error} onRetry={report.reload} /> : data && <>
        <section className="staff-surface staff-finance-hero">
          <span className="staff-feature-icon"><Wallet2 size={24} /></span>
          <p className="staff-muted">Penjualan</p>
          <h2 className="staff-report-total">{formatRupiah(toRupiah(data.grossSales))}</h2>
          <p className="staff-muted">{data.transactionCount} transaksi{data.changePercent != null && ` · ${data.changePercent >= 0 ? '+' : ''}${data.changePercent}% dari periode sebelumnya`}</p>
        </section>
        <section className="staff-surface">
          <h2 className="staff-section__title">Rincian Pembayaran</h2>
          <dl className="staff-details">{rows.map(([label, value]) => value != null && <div key={label}><dt>{label}</dt><dd>{formatRupiah(toRupiah(value))}</dd></div>)}</dl>
        </section>
        {(data.discountTotal == null || data.shippingTotal == null) && <p className="staff-muted">Rincian diskon atau ongkir belum tersedia untuk periode ini.</p>}
        {!can(Permissions.financeReadFull) && <p className="staff-muted">Anda melihat ringkasan. Buku besar dan laporan rinci koperasi hanya dapat dibuka Admin Kopdes.</p>}
      </>}
    </div>
  </>;
}

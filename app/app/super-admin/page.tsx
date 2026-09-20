'use client';

import Link from 'next/link';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import type { KopdesApplicationStatus, KopdesStats } from '@shared/api';
import { Building2, ClipboardList, ReceiptText, Boxes } from '@shared/design/icons';

/**
 * Ikhtisar pengurus sistem.
 *
 * Yang ditampilkan hanya yang menuntut tindakan (pengajuan menunggu) dan
 * angka sebaran. Rincian transaksi tiap koperasi sengaja tidak ada di mana
 * pun di portal ini.
 */
export default function SuperAdminOverviewPage() {
  const counts = useAsync<Record<KopdesApplicationStatus, number>>(() =>
    api.getApplicationCounts(),
  );
  const stats = useAsync<KopdesStats[]>(() => api.getKopdesStats());

  const totals = (stats.data ?? []).reduce(
    (a, k) => ({
      products: a.products + k.counts.products,
      orders: a.orders + k.counts.orders,
    }),
    { products: 0, orders: 0 },
  );

  return (
    <>
      <h1 className="staff-section__title" style={{ fontSize: 20 }}>
        Ikhtisar Sistem
      </h1>
      <p style={{ fontSize: 13, color: 'var(--st-muted)', margin: '2px 0 var(--sp-base)' }}>
        Koperasi yang bergabung dan seberapa sibuk mereka.
      </p>

      {(counts.loading || stats.loading) && <StaffSkeleton height={120} />}

      {counts.error && <StaffError message={counts.error} onRetry={counts.reload} />}

      {!counts.loading && !counts.error && !stats.loading && (
        <>
          <div className="staff-surface staff-kpi">
            <Tile
              icon={ClipboardList}
              label="Pengajuan Menunggu"
              value={counts.data?.PENDING ?? 0}
              href="/super-admin/pengajuan"
              highlight={(counts.data?.PENDING ?? 0) > 0}
            />
            <Tile
              icon={Building2}
              label="Koperasi Aktif"
              value={stats.data?.length ?? 0}
              href="/super-admin/kopdes"
            />
            <Tile icon={Boxes} label="Total Barang" value={totals.products} />
            <Tile icon={ReceiptText} label="Total Pesanan" value={totals.orders} />
          </div>

          {(counts.data?.PENDING ?? 0) > 0 && (
            <Link
              href="/super-admin/pengajuan"
              className="staff-ai"
              style={{ marginTop: 'var(--sp-lg)' }}
            >
              <span className="staff-ai__icon" aria-hidden="true">
                <ClipboardList size={18} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--st-ink)' }}>
                  {counts.data?.PENDING} koperasi menunggu ditinjau
                </span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--st-muted)' }}>
                  Setujui untuk membuat koperasi beserta akun pengurusnya.
                </span>
              </span>
            </Link>
          )}
        </>
      )}
    </>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  href,
  highlight = false,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  href?: string;
  highlight?: boolean;
}) {
  const body = (
    <>
      <Icon
        size={18}
        aria-hidden="true"
        style={{ color: highlight ? 'var(--st-primary)' : 'var(--st-muted)' }}
      />
      <span className="staff-kpi__value">{value}</span>
      <span className="staff-kpi__label">{label}</span>
    </>
  );
  return href ? (
    <Link className="staff-kpi__tile" href={href}>
      {body}
    </Link>
  ) : (
    <div className="staff-kpi__tile">{body}</div>
  );
}

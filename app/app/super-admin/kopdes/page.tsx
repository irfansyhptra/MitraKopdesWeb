'use client';

import Link from 'next/link';
import { api } from '@/lib/api';
import { useState } from 'react';
import { useAsync } from '@/components/staff/useAsync';
import { CreateKopdesDialog } from '@/components/super/CreateKopdesDialog';
import { CredentialPanel } from '@/components/super/CredentialPanel';
import { StaffError, StaffSkeleton } from '@/components/staff/Section';
import type { ApprovalResult, KopdesStats } from '@shared/api';
import { Boxes, Building2, Plus, ReceiptText, Store } from '@shared/design/icons';

/**
 * Pemantauan koperasi — **hanya jumlah**.
 *
 * Pengurus sistem perlu tahu koperasi mana yang hidup dan seberapa sibuk,
 * bukan siapa membeli apa. Halaman ini tidak punya jalan menuju rincian
 * pesanan karena backend memang tidak menyediakannya: `/super-admin/kopdes`
 * mengembalikan angka agregat dan tidak menerima parameter yang bisa
 * membukanya lebih dalam.
 */
export default function KopdesMonitorPage() {
  const stats = useAsync<KopdesStats[]>(() => api.getKopdesStats());
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ApprovalResult | null>(null);

  const total = (stats.data ?? []).reduce(
    (acc, k) => ({
      products: acc.products + k.counts.products,
      orders: acc.orders + k.counts.orders,
      staff: acc.staff + k.counts.staff,
      umkms: acc.umkms + k.counts.umkms,
    }),
    { products: 0, orders: 0, staff: 0, umkms: 0 },
  );

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--sp-md)',
          flexWrap: 'wrap',
          marginBottom: 'var(--sp-base)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="staff-section__title" style={{ fontSize: 20 }}>
            Koperasi Terdaftar
          </h1>
          <p style={{ fontSize: 13, color: 'var(--st-muted)', marginTop: 2 }}>
            Jumlah barang, pesanan, pegawai, dan mitra per koperasi. Rincian
            transaksi adalah urusan masing-masing Kopdes.
          </p>
        </div>
        {/* Jalur kedua di samping kotak pengajuan: permintaan yang datang
            lewat telepon atau tatap muka tidak perlu diminta mengisi formulir
            lebih dulu. */}
        <button
          type="button"
          className="staff-btn"
          style={{ width: 'auto' }}
          onClick={() => setCreating(true)}
        >
          <Plus size={15} aria-hidden="true" /> Buat Koperasi
        </button>
      </div>

      {stats.loading && <StaffSkeleton height={180} />}

      {!stats.loading && stats.error && (
        <StaffError message={stats.error} onRetry={stats.reload} />
      )}

      {!stats.loading && !stats.error && stats.data?.length === 0 && (
        <div className="staff-surface staff-empty">
          Belum ada koperasi terdaftar.{' '}
          <Link href="/super-admin/pengajuan" className="staff-section__action">
            Lihat pengajuan masuk
          </Link>{' '}
          atau buat langsung lewat tombol di atas.
        </div>
      )}

      {!stats.loading && !stats.error && !!stats.data?.length && (
        <>
          <div className="staff-surface staff-kpi" style={{ marginBottom: 'var(--sp-base)' }}>
            <Total icon={Building2} label="Koperasi" value={stats.data.length} />
            <Total icon={Boxes} label="Total Barang" value={total.products} />
            <Total icon={ReceiptText} label="Total Pesanan" value={total.orders} />
            <Total icon={Store} label="Total Mitra" value={total.umkms} />
          </div>

          <div className="staff-surface staff-surface--flush">
            {stats.data.map((k) => (
              <div className="staff-order" key={k.id}>
                <span className="staff-order__thumb">
                  <Building2 size={20} aria-hidden="true" />
                </span>
                <div className="staff-order__body">
                  <p className="staff-order__customer" style={{ fontWeight: 600 }}>
                    {k.name}
                  </p>
                  <p className="staff-order__meta">
                    <span>
                      {k.village}, {k.district}, {k.city}
                    </span>
                  </p>
                  <p className="staff-order__meta" style={{ marginTop: 4 }}>
                    <span className="staff-chip">{k.counts.products} barang</span>
                    <span className="staff-chip">{k.counts.orders} pesanan</span>
                    <span className="staff-chip">{k.counts.staff} pegawai</span>
                    <span className="staff-chip">{k.counts.umkms} mitra</span>
                    {/* Koperasi yang belum aktif ditulis, bukan sekadar
                        diberi warna berbeda. */}
                    {!k.isActive && (
                      <span
                        className="staff-chip"
                        style={{
                          ['--chip-fg' as string]: 'var(--st-primary)',
                          ['--chip-bg' as string]:
                            'color-mix(in srgb, var(--st-primary) 12%, #fff)',
                        }}
                      >
                        Nonaktif
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialogs
        creating={creating}
        created={created}
        onCloseCreate={() => setCreating(false)}
        onCreated={(result) => {
          setCreating(false);
          setCreated(result);
          stats.reload();
        }}
        onCloseCredential={() => setCreated(null)}
      />
    </>
  );
}

function Dialogs({
  creating,
  created,
  onCloseCreate,
  onCreated,
  onCloseCredential,
}: {
  creating: boolean;
  created: ApprovalResult | null;
  onCloseCreate: () => void;
  onCreated: (r: ApprovalResult) => void;
  onCloseCredential: () => void;
}) {
  return (
    <>
      {creating && (
        <CreateKopdesDialog onClose={onCloseCreate} onCreated={onCreated} />
      )}
      {created && (
        <CredentialPanel result={created} onClose={onCloseCredential} />
      )}
    </>
  );
}

function Total({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
}) {
  return (
    <div className="staff-kpi__tile">
      <Icon size={18} aria-hidden="true" style={{ color: 'var(--st-primary)' }} />
      <span className="staff-kpi__value">{value}</span>
      <span className="staff-kpi__label">{label}</span>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useStaff } from '@/components/staff/StaffContext';
import { useAsync } from '@/components/staff/useAsync';
import {
  StaffError,
  StaffSection,
  StaffSkeleton,
} from '@/components/staff/Section';
import { formatRupiah, toRupiah } from '@shared/format';
import { Permissions } from '@shared/api';
import type { FinanceSummary, StaffTodayOrder } from '@shared/api';
import {
  Bike,
  Boxes,
  LocateFixed,
  Lock,
  PackagePlus,
  Package,
  ReceiptText,
  Route,
  Sparkles,
  TriangleAlert,
  Truck,
  UsersRound,
  Wallet2,
  type LucideIcon,
} from '@shared/design/icons';

/**
 * Beranda Pegawai Kopdes — padanan `KopdesEmployeeDashboardPage`.
 *
 * Setiap bagian memuat datanya sendiri. Satu endpoint yang lambat tidak
 * menahan seluruh halaman, dan satu yang gagal tidak mengosongkannya.
 */

export default function PegawaiDashboardPage() {
  return (
    <>
      <KpiSection />
      <QuickAccess />
      <TodayOrders />
      <InsightPanels />
      <AiBanner />
    </>
  );
}

// ── KPI ───────────────────────────────────────────────────────────────────

function KpiSection() {
  const summary = useAsync(() => api.getStaffSummary());

  if (summary.loading) {
    return (
      <div className="staff-surface staff-kpi">
        {[0, 1, 2, 3].map((i) => (
          <div className="staff-kpi__tile" key={i}>
            <StaffSkeleton height={22} width={36} />
            <StaffSkeleton height={11} width="70%" />
          </div>
        ))}
      </div>
    );
  }

  if (summary.error || !summary.data) {
    return <StaffError message="Ringkasan belum berhasil dimuat" onRetry={summary.reload} />;
  }

  const d = summary.data;
  const tiles: { label: string; value: number; icon: LucideIcon; color: string; href: string }[] = [
    { label: 'Pesanan Baru', value: d.newOrders, icon: ReceiptText, color: 'var(--st-primary)', href: '/pegawai/pesanan?status=PAID' },
    { label: 'Perlu Diproses', value: d.needProcessing, icon: Package, color: 'var(--st-warning)', href: '/pegawai/pesanan?status=PROCESSING' },
    { label: 'Siap Dikirim', value: d.readyToShip, icon: Truck, color: 'var(--st-success)', href: '/pegawai/pesanan?status=READY_FOR_DELIVERY' },
    { label: 'Stok Menipis', value: d.lowStockProducts, icon: TriangleAlert, color: '#ea6a12', href: '/pegawai/stok?filter=low' },
  ];

  return (
    <div className="staff-surface staff-kpi">
      {tiles.map((t) => (
        <Link className="staff-kpi__tile" href={t.href} key={t.label}>
          <t.icon size={18} aria-hidden="true" style={{ color: t.color }} />
          <span className="staff-kpi__value">{t.value}</span>
          <span className="staff-kpi__label">{t.label}</span>
        </Link>
      ))}
    </div>
  );
}

// ── Akses cepat ───────────────────────────────────────────────────────────

const ACTIONS: {
  label: string;
  icon: LucideIcon;
  color: string;
  href: string;
  permission: string;
  /** Disembunyikan sepenuhnya bila tidak berwenang, bukan ditampilkan terkunci. */
  ownerOnly?: boolean;
}[] = [
  { label: 'Input Barang', icon: PackagePlus, color: '#d7192d', href: '/pegawai/barang/baru', permission: Permissions.productCreate },
  { label: 'Pesanan Masuk', icon: ReceiptText, color: '#2878d0', href: '/pegawai/pesanan', permission: Permissions.orderRead },
  { label: 'Atur Pengiriman', icon: Route, color: '#7442c8', href: '/pegawai/pengiriman', permission: Permissions.deliveryRead },
  { label: 'Kirim ke Kurir', icon: Bike, color: '#159455', href: '/pegawai/kurir', permission: Permissions.deliveryAssign },
  { label: 'Lacak Pesanan', icon: LocateFixed, color: '#0e9aa7', href: '/pegawai/lacak', permission: Permissions.deliveryRead },
  { label: 'Manajemen Stok', icon: Boxes, color: '#f59e0b', href: '/pegawai/stok', permission: Permissions.inventoryRead },
  { label: 'Keuangan', icon: Wallet2, color: '#2f6d3c', href: '/pegawai/keuangan', permission: Permissions.financeReadSummary },
  { label: 'AI Assistant', icon: Sparkles, color: '#b3208c', href: '/pegawai/ai', permission: Permissions.aiAssist },
  // Milik pemilik koperasi. Tidak ikut tampil terkunci bagi pegawai: yang
  // terkunci menandakan "ada, tapi bukan untukmu", sedangkan pengelolaan akun
  // memang bukan bagian pekerjaan pegawai sama sekali.
  { label: 'Akun Pegawai', icon: UsersRound, color: '#0f766e', href: '/pegawai/akun', permission: Permissions.staffManage, ownerOnly: true },
];

/** Latar pastel tile — `KopdesEmployeeColors.tint`: warna pada 12% di atas putih. */
function tint(hex: string): string {
  return `color-mix(in srgb, ${hex} 12%, #fff)`;
}

function QuickAccess() {
  const { can } = useStaff();

  return (
    <StaffSection title="Akses Cepat">
      <div className="staff-quick">
        {ACTIONS.filter((a) => !a.ownerOnly || can(a.permission)).map((action) => {
          const allowed = can(action.permission);
          const body = (
            <>
              <span className="staff-tile__icon">
                <action.icon size={24} aria-hidden="true" />
                {!allowed && (
                  <Lock size={12} className="staff-tile__lock" aria-hidden="true" />
                )}
              </span>
              {action.label}
            </>
          );
          const style = {
            ['--tile-bg' as string]: tint(action.color),
            ['--tile-fg' as string]: action.color,
          };

          // Tile yang tidak boleh dipakai ditandai terkunci, bukan
          // dihilangkan diam-diam: pegawai perlu tahu fiturnya ada dan siapa
          // yang bisa membukanya. Penolakan sesungguhnya tetap di backend.
          if (!allowed) {
            return (
              <span
                key={action.label}
                className="staff-tile"
                aria-disabled="true"
                title={`${action.label} tidak termasuk wewenang Anda. Hubungi Admin Kopdes.`}
                style={style}
              >
                {body}
              </span>
            );
          }

          return (
            <Link key={action.label} href={action.href} className="staff-tile" style={style}>
              {body}
            </Link>
          );
        })}
      </div>
    </StaffSection>
  );
}

// ── Pesanan hari ini ──────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Baru',
  PAID: 'Baru',
  PROCESSING: 'Diproses',
  READY_FOR_DELIVERY: 'Siap Dikirim',
  OUT_FOR_DELIVERY: 'Dalam Pengiriman',
  DELIVERED: 'Diterima',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

/**
 * Tindakan utama per status — kembar dari `ALLOWED_ORDER_TRANSITIONS` di
 * backend. Yang di sini hanya menentukan label tombol; penolakan lompatan
 * status tetap dikerjakan server, jadi kembaran yang tertinggal versi paling
 * buruk membuat tombol gagal, bukan membuat status melompat.
 */
function actionFor(
  status: string,
  courierAssigned: boolean,
): { label: string; next?: string; href?: string } | null {
  switch (status) {
    case 'PENDING':
    case 'PAID':
      return { label: 'Proses', next: 'PROCESSING' };
    case 'PROCESSING':
      return { label: 'Siapkan Barang', next: 'READY_FOR_DELIVERY' };
    case 'READY_FOR_DELIVERY':
      return courierAssigned
        ? { label: 'Lihat Kurir', href: '/pegawai/kurir' }
        : { label: 'Kirim ke Kurir', href: '/pegawai/kurir' };
    case 'OUT_FOR_DELIVERY':
      return { label: 'Lacak', href: '/pegawai/lacak' };
    default:
      return null;
  }
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function TodayOrders() {
  const orders = useAsync(() => api.getStaffTodayOrders(3));
  const [rows, setRows] = useState<StaffTodayOrder[] | null>(null);
  const list = rows ?? orders.data;

  return (
    <StaffSection title="Pesanan Hari Ini" actionLabel="Lihat Semua" href="/pegawai/pesanan">
      {orders.loading && (
        <div className="staff-surface staff-surface--flush">
          {[0, 1, 2].map((i) => (
            <div className="staff-order" key={i}>
              <StaffSkeleton height={44} width={44} radius={12} />
              <div className="staff-order__body">
                <StaffSkeleton height={13} width="40%" />
                <div style={{ height: 6 }} />
                <StaffSkeleton height={12} width="70%" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!orders.loading && orders.error && (
        <StaffError message="Pesanan belum berhasil dimuat" onRetry={orders.reload} />
      )}

      {!orders.loading && !orders.error && list?.length === 0 && (
        <div className="staff-surface staff-empty">Belum ada pesanan hari ini</div>
      )}

      {!orders.loading && !orders.error && !!list?.length && (
        <div className="staff-surface staff-surface--flush">
          {list.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              onMoved={(next) =>
                setRows(
                  list.map((o) => (o.id === order.id ? { ...o, status: next } : o)),
                )
              }
            />
          ))}
        </div>
      )}
    </StaffSection>
  );
}

function OrderRow({
  order,
  onMoved,
}: {
  order: StaffTodayOrder;
  onMoved: (next: string) => void;
}) {
  const router = useRouter();
  const { can } = useStaff();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  const baseAction = actionFor(order.status, order.courierAssigned);
  const action = baseAction?.href && order.deliveryId
    ? { ...baseAction, href: `${baseAction.href}?deliveryId=${encodeURIComponent(order.deliveryId)}` }
    : baseAction;
  const needsPermission = !!action?.next;
  const allowed = !needsPermission || can(Permissions.orderProcess);

  async function run() {
    if (!action) return;
    if (action.href) {
      router.push(action.href);
      return;
    }
    setBusy(true);
    setFailed(null);
    try {
      await api.updateAdminOrderStatus(order.id, action.next!);
      onMoved(action.next!);
    } catch (e) {
      // Baris tetap pada statusnya semula: menampilkan status baru sebelum
      // server menerimanya membuat pegawai mengira pekerjaannya sudah selesai.
      setFailed((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="staff-order">
      <span className="staff-order__thumb">
        {order.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={order.thumbnailUrl} alt="" loading="lazy" />
        ) : (
          <Package size={20} aria-hidden="true" />
        )}
      </span>

      <div className="staff-order__body">
        <p className="staff-order__ref">
          <span>#{order.reference}</span>
          <span>{timeLabel(order.createdAt)}</span>
        </p>
        <p className="staff-order__customer">{order.customerName}</p>
        <p className="staff-order__meta">
          <span>{order.itemCount} produk</span>
          <span className="staff-order__total">
            {formatRupiah(toRupiah(order.totalAmount))}
          </span>
          <span className="staff-chip">
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </p>
        {failed && (
          <p className="form-error" style={{ marginTop: 4 }}>
            {failed}
          </p>
        )}
      </div>

      {action && (
        <div className="staff-order__action">
          <button
            type="button"
            className="staff-btn"
            disabled={busy || !allowed}
            title={allowed ? undefined : 'Tindakan ini tidak termasuk wewenang Anda'}
            onClick={() => void run()}
          >
            {busy ? 'Memproses…' : action.label}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Stok & keuangan ───────────────────────────────────────────────────────

function InsightPanels() {
  return (
    <div className="staff-panels" style={{ marginTop: 'var(--sp-lg)' }}>
      <StockPanel />
      <FinancePanel />
    </div>
  );
}

function StockPanel() {
  const stock = useAsync(() => api.getStaffStockSummary());

  if (stock.loading) {
    return (
      <div className="staff-surface">
        <StaffSkeleton height={15} width={110} />
        <div style={{ height: 12 }} />
        <StaffSkeleton height={64} width={64} radius={32} />
      </div>
    );
  }

  if (stock.error || !stock.data) {
    return <StaffError message="Ringkasan stok belum berhasil dimuat" onRetry={stock.reload} />;
  }

  const { activeProducts, lowStock, outOfStock } = stock.data;
  const total = activeProducts + lowStock + outOfStock;
  // Total nol menghasilkan pembagian nol; cincinnya digambar kosong.
  const okPct = total > 0 ? (activeProducts / total) * 100 : 0;
  const lowPct = total > 0 ? ((activeProducts + lowStock) / total) * 100 : 0;

  return (
    <div className="staff-surface">
      <p className="staff-section__title">Ringkasan Stok</p>
      <div className="staff-stock-summary">
        <span
          className="staff-ring"
          data-total={total}
          role="img"
          aria-label={`${total} produk: ${activeProducts} aman, ${lowStock} menipis, ${outOfStock} habis`}
          style={{
            ['--ring-ok' as string]: `${okPct}%`,
            ['--ring-low' as string]: `${lowPct}%`,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <p className="staff-stockline" style={{ color: 'var(--st-success)' }}>
            <i /> <span style={{ color: 'var(--st-muted)' }}>{activeProducts} Produk Aktif</span>
          </p>
          <p className="staff-stockline" style={{ color: 'var(--st-warning)' }}>
            <i /> <span style={{ color: 'var(--st-muted)' }}>{lowStock} Stok Menipis</span>
          </p>
          <p className="staff-stockline" style={{ color: 'var(--st-primary)' }}>
            <i /> <span style={{ color: 'var(--st-muted)' }}>{outOfStock} Stok Habis</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function FinancePanel() {
  const { can } = useStaff();
  const allowed = can(Permissions.financeReadSummary);
  const finance = useAsync<FinanceSummary | null>(
    () => (allowed ? api.getStaffFinance('today') : Promise.resolve(null)),
    [allowed],
  );

  if (!allowed) {
    return (
      <div className="staff-surface">
        <p className="staff-section__title">Keuangan Hari Ini</p>
        <p style={{ fontSize: 13, color: 'var(--st-muted)', marginTop: 'var(--sp-sm)' }}>
          <Lock size={13} aria-hidden="true" /> Rekap keuangan tidak termasuk
          wewenang Anda.
        </p>
      </div>
    );
  }

  if (finance.loading) {
    return (
      <div className="staff-surface">
        <StaffSkeleton height={15} width={130} />
        <div style={{ height: 12 }} />
        <StaffSkeleton height={22} width="60%" />
      </div>
    );
  }

  if (finance.error || !finance.data) {
    return <StaffError message="Rekap keuangan belum berhasil dimuat" onRetry={finance.reload} />;
  }

  const f = finance.data;
  return (
    <div className="staff-surface">
      <p className="staff-section__title">Keuangan Hari Ini</p>
      <p className="staff-money" style={{ marginTop: 'var(--sp-md)' }}>
        {formatRupiah(toRupiah(f.grossSales))}
      </p>
      <p style={{ fontSize: 12, color: 'var(--st-muted)', marginTop: 2 }}>
        {f.transactionCount} transaksi
        {f.changePercent != null && (
          <>
            {' · '}
            <span
              style={{
                color: f.changePercent >= 0 ? 'var(--st-success)' : 'var(--st-primary)',
                fontWeight: 700,
              }}
            >
              {f.changePercent >= 0 ? '+' : ''}
              {f.changePercent}% dari kemarin
            </span>
          </>
        )}
      </p>
      <div style={{ marginTop: 'var(--sp-md)', display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
        <span className="staff-chip">QRIS {formatRupiah(toRupiah(f.qrisTotal))}</span>
        <span className="staff-chip">COD {formatRupiah(toRupiah(f.codTotal))}</span>
      </div>
    </div>
  );
}

// ── Banner AI ─────────────────────────────────────────────────────────────

/**
 * Insight-nya diambil dari ringkasan stok yang sudah dimuat, bukan dari
 * panggilan LLM tersendiri. Menghitung "7 produk perlu direstok" tidak
 * membutuhkan model bahasa, dan memanggil AI hanya untuk mengisi satu baris
 * banner berarti membayar latensi model di jalur pemuatan dashboard.
 */
function AiBanner() {
  const { can } = useStaff();
  const stock = useAsync(() => api.getStaffStockSummary());

  if (!can(Permissions.aiAssist)) return null;

  const insight = stock.loading
    ? 'Menyiapkan ringkasan operasional…'
    : stock.error || !stock.data
      ? 'Ringkasan operasional belum tersedia'
      : stock.data.outOfStock > 0
        ? `${stock.data.outOfStock} produk habis dan ${stock.data.lowStock} perlu segera direstok`
        : stock.data.lowStock > 0
          ? `${stock.data.lowStock} produk perlu segera direstok`
          : 'Stok aman — tanyakan prioritas pesanan hari ini';

  return (
    <Link href="/pegawai/ai" className="staff-ai">
      <span className="staff-ai__icon" aria-hidden="true">
        <Sparkles size={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--st-ink)' }}>
          AI Assistant Kopdes
        </span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--st-muted)' }}>
          {insight}
        </span>
      </span>
    </Link>
  );
}

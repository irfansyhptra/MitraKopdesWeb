/**
 * Pemformat nominal & status — padanan `order_totals.dart` dan
 * `order_status_view.dart` pada aplikasi Flutter.
 *
 * Nominal diolah sebagai integer rupiah, bukan `number` pecahan: backend
 * mengirim `Decimal` sebagai string justru supaya nilainya tidak melewati
 * floating point, dan mem-parse-nya ke pecahan di sini membuang jaminan itu.
 */

/** "116000.00" | 116000 | null → 116000 (rupiah bulat). */
export function toRupiah(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return Math.round(value);
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

/** 3450000 → "Rp3.450.000" */
export function formatRupiah(value: number): string {
  const negative = value < 0;
  const digits = Math.abs(Math.round(value)).toString();
  let out = '';

  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += '.';
    out += digits[i];
  }

  return `${negative ? '-' : ''}Rp${out}`;
}

/** Komponen uang satu pesanan — rumusnya sama dengan `composeOrderTotals`. */
export interface OrderTotals {
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
}

export function orderTotal(t: OrderTotals): number {
  // Diskon dipotong sampai nilai barang: total negatif berarti koperasi
  // membayar pembeli, dan tidak ada jalur pengembalian uang untuk itu.
  const discount = Math.min(t.discountAmount, t.subtotal);
  return t.subtotal + t.shippingFee - discount;
}

/** Ongkir nol ditulis sebagai kata — itu yang dibaca pemesan sebagai kabar baik. */
export function shippingLabel(fee: number): string {
  return fee > 0 ? formatRupiah(fee) : 'Gratis';
}

/**
 * Status pesanan dalam bahasa pemesan.
 *
 * Nama enum di database adalah bahasa gudang (`READY_FOR_DELIVERY`); yang
 * dibaca pembeli harus menyebut apa yang sedang terjadi pada barangnya.
 * Dipetakan di satu tempat supaya tiap layar tidak menerjemahkan sendiri.
 */
export type OrderStage =
  | 'new'
  | 'processing'
  | 'shipping'
  | 'arrived'
  | 'done'
  | 'cancelled';

export interface OrderStatusView {
  label: string;
  stage: OrderStage;
  /** Pesanan masih berjalan — masuk tab "Diproses". */
  active: boolean;
  cancelled: boolean;
  /** Kelas lencana pada components.css. */
  badgeClass: string;
}

const STATUS_VIEWS: Record<string, OrderStatusView> = {
  PENDING: {
    label: 'Menunggu Pembayaran',
    stage: 'new',
    active: true,
    cancelled: false,
    badgeClass: 'kc-badge--warning',
  },
  PAID: {
    label: 'Sudah Dibayar',
    stage: 'new',
    active: true,
    cancelled: false,
    badgeClass: 'kc-badge--primary',
  },
  PROCESSING: {
    label: 'Sedang Disiapkan',
    stage: 'processing',
    active: true,
    cancelled: false,
    badgeClass: 'kc-badge--warning',
  },
  READY_FOR_DELIVERY: {
    label: 'Siap Dikirim',
    stage: 'processing',
    active: true,
    cancelled: false,
    badgeClass: 'kc-badge--primary',
  },
  OUT_FOR_DELIVERY: {
    label: 'Dalam Pengiriman',
    stage: 'shipping',
    active: true,
    cancelled: false,
    badgeClass: 'kc-badge--primary',
  },
  // Barang sudah diantar tapi belum dikonfirmasi pemesan — masih berjalan,
  // karena pemesan masih punya langkah yang harus dilakukan.
  DELIVERED: {
    label: 'Sudah Diantar',
    stage: 'arrived',
    active: true,
    cancelled: false,
    badgeClass: 'kc-badge--success',
  },
  COMPLETED: {
    label: 'Selesai',
    stage: 'done',
    active: false,
    cancelled: false,
    badgeClass: 'kc-badge--success',
  },
  CANCELLED: {
    label: 'Dibatalkan',
    stage: 'cancelled',
    active: false,
    cancelled: true,
    badgeClass: 'kc-badge--muted',
  },
};

export function statusView(status: string | undefined): OrderStatusView {
  // Status yang belum dikenal dianggap masih berjalan: menyembunyikannya dari
  // kedua tab akan membuat pesanan hilang dari layar pemesan.
  return (
    STATUS_VIEWS[status ?? ''] ?? {
      label: status ?? 'Diproses',
      stage: 'processing',
      active: true,
      cancelled: false,
      badgeClass: 'kc-badge--muted',
    }
  );
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/** "17 Sep 2026" */
export function formatDate(value: string | Date | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "10:24" */
export function formatTime(value: string | Date | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

/**
 * Nomor pesanan yang dibaca pemesan: nomor invoice bila sudah terbit, kalau
 * belum potongan id — bukan UUID penuh yang tidak bisa dibacakan di telepon.
 */
export function orderNumber(order: {
  id: string;
  invoice?: { invoiceNumber?: string } | null;
}): string {
  const invoice = order.invoice?.invoiceNumber;
  if (invoice) return invoice;
  return `#${order.id.slice(0, 8).toUpperCase()}`;
}

/**
 * Rating dalam format Indonesia: koma sebagai pemisah desimal.
 *
 * `null` berarti belum ada ulasan — bukan nol bintang, jadi pemanggilnya bisa
 * memilih tidak menggambar barisnya sama sekali.
 *
 * Tinggal di sini, bukan di salah satu kartu: sebelumnya kartu Kopdes memakai
 * koma sementara kartu produk dan daftar mitra memakai titik.
 */
export function ratingLabel(rating: {
  average: number | null;
  count: number;
}): string | null {
  if (rating?.average == null || rating.count < 1) return null;
  return rating.average.toFixed(1).replace('.', ',');
}

import type { PaymentMethodCode } from '@shared/api';

/**
 * Katalog metode pembayaran.
 *
 * Hanya yang benar-benar didukung backend dan aktif di akun merchant.
 * Metode yang belum terintegrasi tidak didaftarkan di sini — pilihan yang
 * pasti gagal saat ditekan lebih buruk daripada pilihan yang tidak
 * ditawarkan.
 *
 * Kartu kredit sengaja tidak ada: input kartu langsung menuntut kepatuhan
 * PCI DSS tersendiri, dan itu keputusan yang layak diambil terpisah.
 */

export type MethodGroup = 'wallet' | 'va' | 'other';

export interface PaymentMethodInfo {
  code: PaymentMethodCode;
  name: string;
  description: string;
  group: MethodGroup;
  /** Inisial pengganti logo; berkas logo resmi menyusul bila tersedia. */
  short: string;
  /** Warna lencana metode. */
  tint: string;
  /** Halaman instruksi mana yang dibuka setelah transaksi dibuat. */
  instruction: 'qris' | 'va' | 'ewallet' | 'bill';
  /** Biaya tambahan yang dibebankan penerbit, bila ada. */
  fee?: string;
}

export const METHOD_GROUPS: { id: MethodGroup; label: string }[] = [
  { id: 'wallet', label: 'QRIS & Dompet Digital' },
  { id: 'va', label: 'Virtual Account' },
  { id: 'other', label: 'Metode Lainnya' },
];

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    code: 'QRIS',
    name: 'QRIS',
    description: 'Bayar dengan memindai QR dari aplikasi bank atau dompet digital mana pun.',
    group: 'wallet',
    short: 'QR',
    tint: '#d7192d',
    instruction: 'qris',
  },
  {
    code: 'GOPAY',
    name: 'GoPay',
    description: 'Buka aplikasi Gojek, atau pindai QR bila membuka dari perangkat lain.',
    group: 'wallet',
    short: 'GP',
    tint: '#00aed6',
    instruction: 'ewallet',
  },
  {
    code: 'SHOPEEPAY',
    name: 'ShopeePay',
    description: 'Buka aplikasi Shopee untuk menyelesaikan pembayaran.',
    group: 'wallet',
    short: 'SP',
    tint: '#ee4d2d',
    instruction: 'ewallet',
  },
  {
    code: 'BCA_VA',
    name: 'BCA Virtual Account',
    description: 'Transfer lewat ATM, m-BCA, atau KlikBCA.',
    group: 'va',
    short: 'BCA',
    tint: '#0060af',
    instruction: 'va',
  },
  {
    code: 'BNI_VA',
    name: 'BNI Virtual Account',
    description: 'Transfer lewat ATM, BNI Mobile, atau internet banking.',
    group: 'va',
    short: 'BNI',
    tint: '#f05a22',
    instruction: 'va',
  },
  {
    code: 'BRI_VA',
    name: 'BRI Virtual Account',
    description: 'Transfer lewat ATM, BRImo, atau internet banking.',
    group: 'va',
    short: 'BRI',
    tint: '#00529c',
    instruction: 'va',
  },
  {
    code: 'PERMATA_VA',
    name: 'Permata Virtual Account',
    description: 'Transfer lewat ATM atau PermataMobile.',
    group: 'va',
    short: 'PMT',
    tint: '#00857d',
    instruction: 'va',
  },
  {
    code: 'MANDIRI_BILL',
    name: 'Mandiri Bill Payment',
    description: 'Bayar dengan kode perusahaan dan kode bayar di ATM atau Livin.',
    group: 'other',
    short: 'MDR',
    tint: '#003d79',
    instruction: 'bill',
  },
];

export function methodInfo(code: string): PaymentMethodInfo | undefined {
  return PAYMENT_METHODS.find((m) => m.code === code);
}

/** Metode terakhir yang dipakai, supaya tidak perlu dicari ulang tiap kali. */
const LAST_METHOD_KEY = 'kopdes_last_payment_method';

export function rememberMethod(code: PaymentMethodCode) {
  try {
    window.localStorage.setItem(LAST_METHOD_KEY, code);
  } catch {
    // Mode penyamaran menolak localStorage; mengingat metode terakhir hanya
    // kenyamanan dan tidak boleh menggagalkan pembayaran.
  }
}

export function lastMethod(): PaymentMethodCode | null {
  try {
    const raw = window.localStorage.getItem(LAST_METHOD_KEY);
    return PAYMENT_METHODS.some((m) => m.code === raw)
      ? (raw as PaymentMethodCode)
      : null;
  } catch {
    return null;
  }
}

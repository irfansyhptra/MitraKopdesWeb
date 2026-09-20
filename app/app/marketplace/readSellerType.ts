import type { MarketplaceSellerType } from '@shared/api';

const VALID: MarketplaceSellerType[] = ['ALL', 'KOPDES', 'UMKM'];

/**
 * Membaca `?sellerType=` dari URL.
 *
 * Nilainya tidak dipercaya begitu saja. Tautan lama memakai huruf kecil
 * (`?sellerType=umkm`), dan meneruskannya apa adanya membuat backend
 * menjawab 400 — seluruh katalog kosong hanya karena satu tautan yang
 * dibookmark. Huruf besar-kecil disamakan, dan nilai asing jatuh ke 'ALL'
 * alih-alih menggagalkan halaman.
 *
 * Berkas sendiri supaya bisa diuji tanpa merender halamannya.
 */
export function readSellerType(
  raw: string | null | undefined,
): MarketplaceSellerType {
  const upper = (raw ?? '').toUpperCase() as MarketplaceSellerType;
  return VALID.includes(upper) ? upper : 'ALL';
}

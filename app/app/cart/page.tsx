import { redirect } from 'next/navigation';

/**
 * Keranjang kini menjadi salah satu subpage halaman Pesanan — sama seperti
 * di aplikasi mobile, di mana `/cart` juga membuka `OrdersPage`.
 * Rutenya dipertahankan supaya tautan lama tidak putus.
 */
export default function CartRedirect() {
  redirect('/orders');
}

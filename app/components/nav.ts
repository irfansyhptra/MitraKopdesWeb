import {
  ClipboardList,
  House,
  Sparkles,
  Store,
  UserIcon,
  type LucideIcon,
} from '@shared/design/icons';

/**
 * Tujuan navigasi pelanggan — sama persis dengan `CustomBottomNavBar` di
 * mobile: Beranda, Marketplace, Asisten, Pesanan, Profil. Asisten diberi
 * aksen, seperti `isAccent` pada item yang sama di Dart.
 *
 * Satu daftar dipakai bilah atas, bilah bawah, dan sidebar. Dua salinan
 * sempat berbeda isinya, dan itulah alasan daftarnya tinggal di sini.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  accent?: boolean;
}

export const NAV: NavItem[] = [
  { href: '/', label: 'Beranda', icon: House },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/ai-assistant', label: 'Asisten', icon: Sparkles, accent: true },
  { href: '/orders', label: 'Pesanan', icon: ClipboardList },
  { href: '/profile', label: 'Profil', icon: UserIcon },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

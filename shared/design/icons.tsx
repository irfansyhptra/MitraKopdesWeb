/**
 * Ikon bersama — satu pintu ke `lucide-react` untuk app maupun landing.
 *
 * Sebelumnya ikon ditulis sebagai karakter Unicode (`⌂`, `◍`, `✦`, `➤`).
 * Karakter seperti itu bergantung pada font yang kebetulan terpasang di
 * mesin pembaca: di banyak Linux dan Windows ia muncul sebagai kotak kosong,
 * dan emoji ikut berubah bentuk mengikuti sistem operasi. Ikon di sini adalah
 * SVG yang ikut dikirim bersama halaman, jadi bentuknya sama di mana pun.
 *
 * Semua ikon mewarisi `currentColor`, sehingga warnanya diatur dari CSS di
 * tempat pemakaian — sama seperti `Icon(..., color: ...)` di Flutter.
 */

export {
  // Navigasi
  House,
  Store,
  Sparkles,
  ClipboardList,
  User as UserIcon,
  // Aksi
  ShoppingCart,
  Search,
  SlidersHorizontal,
  Send,
  Plus,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  X,
  ImagePlus,
  Check,
  Copy,
  Download,
  Share2,
  ExternalLink,
  QrCode,
  Landmark,
  Trash2,
  LogOut,
  // Identitas & status
  BadgeCheck,
  MapPin,
  Navigation,
  Mail,
  Phone,
  Wallet,
  Star,
  Award,
  Building2,
  CircleCheckBig,
  ShieldCheck,
  // Portal pegawai
  LayoutDashboard,
  Package2,
  UsersRound,
  Bell,
  Clock,
  CircleSlash,
  Boxes,
  Route,
  Bike,
  LocateFixed,
  PackagePlus,
  Wallet2,
  Lock,
  TriangleAlert,
  RefreshCw,
  // Katalog
  Package,
  PackageOpen,
  Truck,
  Tag,
  TrendingUp,
  Flame,
  Percent,
  Salad,
  ReceiptText,
  Handshake,
  Utensils,
  ShoppingBasket,
  // Kategori
  Wheat,
  CupSoda,
  Soup,
  SprayCan,
  Sparkle,
  Carrot,
  ShoppingBag,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';
import {
  Carrot,
  CupSoda,
  ShoppingBag,
  Soup,
  Sparkle,
  SprayCan,
  Wheat,
} from 'lucide-react';

export type { LucideIcon };

/**
 * Ikon kategori. Nama kategori datang dari backend dan bisa berubah kapan
 * saja, jadi pencocokannya longgar dan selalu punya jatuhnya.
 */
const CATEGORY_ICONS: [RegExp, LucideIcon][] = [
  [/sembako|beras|bahan/i, Wheat],
  [/minum|kopi|teh/i, CupSoda],
  [/instan|mie|makan/i, Soup],
  [/rawat|mandi|bersih/i, SprayCan],
  [/kosmetik|cantik/i, Sparkle],
  [/sayur|buah|segar/i, Carrot],
];

export function categoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS.find(([re]) => re.test(name))?.[1] ?? ShoppingBag;
}

/**
 * Warna tile kategori — deret yang sama dengan `AppleTints.palette` di
 * `apple_ui.dart`. Tilenya berisi warna penuh dengan ikon putih di atasnya,
 * persis seperti `AppleMenuTile` saat diberi tint.
 */
export const TILE_TINTS = [
  '#b4693c', // terakota
  '#3a7ca5', // biru laut
  '#c08a2e', // amber tua
  '#7a5ea8', // ungu
  '#b05070', // mawar
  '#3f8a6e', // hijau
];

export function tintAt(i: number): string {
  return TILE_TINTS[i % TILE_TINTS.length];
}

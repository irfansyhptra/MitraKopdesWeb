# Urutan Pengerjaan Website KMP Mitra

Website ini **bukan produk baru** — ia tampilan web dari aplikasi Flutter yang
sudah berjalan, memakai backend NestJS yang sama (`/api/v1`). Karena itu
aturan utamanya: **jangan mendesain ulang.** Setiap komponen web punya
padanannya di Dart, dan angka yang dipakai diambil dari
`lib/core/theme/theme.dart` lewat `shared/design/tokens.css`.

Kalau sebuah keputusan desain belum ada di aplikasi mobile, itu tanda
keputusannya belum diambil — bukan tanda web boleh mengarangnya sendiri.

## Aturan yang berlaku di seluruh tahap

| Aturan | Alasan |
|---|---|
| Token dari `shared/design/tokens.css` | Satu sumber angka dengan Flutter; palet web lama (hijau `#1f8a4c`) sudah salah merek |
| Filter & paginasi di server | Menyaring satu halaman di browser memberi hasil salah begitu data lebih panjang dari satu halaman |
| Nominal sebagai integer rupiah | `Decimal` dikirim backend sebagai string justru agar tidak lewat floating point |
| Permission dari `/auth/me`, bukan dari role | Backend yang berwenang; UI hanya menyembunyikan yang memang akan ditolak |
| Satu endpoint per bagian dashboard | Rekap keuangan yang gagal tidak boleh mengosongkan kartu pesanan |
| Target sentuh 44 px, status ditulis bukan hanya diberi warna | Sama dengan aturan aksesibilitas di mobile |
| Skeleton seukuran widget aslinya | Tata letak tidak melompat saat data datang |

Breakpoint sama dengan `OrdersSpec.fromWidth` / `KopdesResponsiveSpec`:
`compact <360`, `phone <600`, `tablet <1024`, `large ≥1024`.

---

## Tahap 0 — Fondasi ✅ selesai

| Berkas | Isi |
|---|---|
| `shared/design/tokens.css` | Warna, spacing, radius, elevasi, tipografi, breakpoint — diport dari `theme.dart` |
| `shared/design/components.css` | Kelas `kc-*`: kartu, grup daftar, lencana, chip, tombol, kartu produk, grid, split, skeleton, stepper, tab |
| `shared/design/ui.tsx` | Primitif React: `Card`, `ListGroup`, `SectionHeader`, `Badge`, `SellerBadge`, `Button`, `Chip`, `QuantityStepper`, `SegmentedTabs`, `Skeleton`, `Message`, `MoneyLine` |
| `shared/format.ts` | `formatRupiah`, `toRupiah`, `orderTotal`, `statusView`, `orderNumber`, tanggal |
| `shared/types.ts`, `shared/api.ts` | Tipe + klien untuk seluruh endpoint yang sudah ada, termasuk marketplace, dashboard staf, ulasan, paginasi riwayat |
| `app/components/AppShell.tsx` | Bilah atas (≥720 px) + navigasi bawah (<720 px) dari satu daftar tujuan |

---

## Tahap 1 — Page User

### 1a. Sudah selesai
- **Beranda** (`/`) — server component, seksi Produk Terlaris & UMKM Pilihan
- **Marketplace** (`/marketplace`) — pencarian ditunda 350 ms, filter jenis
  penjual/kategori/urutan dikirim ke server, muat-lebih berhalaman,
  penjaga permintaan basi
- **Pesanan** (`/orders`) — tiga subpage (Keranjang / Diproses / Selesai),
  grup per penjual, checkbox tiga keadaan, stepper dengan pembaruan
  optimistis + rollback, konfirmasi hapus, Ringkasan Belanja sticky dua kolom
  pada ≥900 px, riwayat berhalaman

### 1b. Sisa page user
1. **Detail produk** (`/product/[id]`, `/umkm-product/[id]`) — galeri, lencana
   penjual, stok, pre-order, tombol tambah ke keranjang, daftar ulasan dari
   `GET /reviews`
2. **Detail pesanan** (`/orders/[id]`) — timeline status, alamat, rincian
   pembayaran dari `subtotal`/`shippingFee`/`discountAmount`, tombol
   **Beri Ulasan** yang muncul hanya bila `/reviews/reviewable/:orderId`
   mengembalikan isi
3. **Checkout** (`/checkout`) — alamat, metode bayar, kirim `cartItemIds` yang
   dicentang. Jangan menambahkan ongkir/biaya layanan di klien: backend
   yang menghitung, dan versi Flutter-nya pernah menampilkan Rp12.000 yang
   tidak pernah ditagihkan
4. **Login & daftar** (`/login`, `/register`) — hanya CUSTOMER/UMKM/COURIER
   yang boleh mendaftar sendiri
5. **Profil** (`/dashboard`) — data `/auth/me`, alamat, keluar
6. **Lacak pengiriman** (`/orders/[id]/lacak`) — jangan menggambar pergerakan
   palsu bila GPS belum ada datanya

---

## Tahap 2 — Page Pegawai Kopdes

Prasyarat: tahap 1a (fondasi + shell) selesai. ✅

Portal di bawah `/pegawai`, dengan shell-nya sendiri — **bukan** navigasi
pelanggan. Padanan `lib/features/employee/` di Flutter.

1. **Guard & konteks** — middleware/route guard: `PEGAWAI_KOPDES` dan
   `ADMIN_KOPDES` saja. Ambil permission dari `/admin/dashboard/me`, simpan di
   context, sediakan `can(user, Permissions.x)`
2. **Shell pegawai** — header gradasi merah tua→merah terang, badge peran,
   nama Kopdes, status Toko Buka/Tutup dari `/admin/dashboard/store-status`
   (null = "jadwal belum diatur", bukan "tutup")
3. **Beranda** (`/pegawai`) — KPI 4 angka dari `/admin/dashboard/summary`
   dalam satu grouped surface, Akses Cepat 8 tile (terkunci bila permission
   tidak ada, bukan hilang), Pesanan Hari Ini, Ringkasan Stok, Keuangan
   Hari Ini, banner AI
4. **Pesanan** (`/pegawai/pesanan`) — daftar berhalaman, filter status,
   tombol tindakan mengikuti `ALLOWED_ORDER_TRANSITIONS`. Pembatalan hanya
   bila punya `order:cancel`
5. **Input & kelola barang** (`/pegawai/barang`) — form lengkap: nama,
   kategori, deskripsi, harga, harga diskon, stok, satuan, SKU, batas minimum
   stok, pre-order, status aktif, gambar. Validasi di klien **dan** server
6. **Manajemen stok** (`/pegawai/stok`) — `/admin/inventory/products` dengan
   filter `all|low|out`, riwayat `/admin/inventory/transactions`, sheet
   penyesuaian (masuk/keluar/opname) dengan alasan wajib
7. **Pengiriman & kurir** (`/pegawai/kurir`) — `/admin/couriers`,
   `/admin/deliveries`, assign/unassign
8. **Keuangan** (`/pegawai/keuangan`) — harian/mingguan/bulanan,
   `finance:read:summary`; buku besar ditahan `finance:read:full`
9. **AI Assistant** (`/pegawai/ai`) — endpoint dipilih backend per peran,
   bukan pencocokan kata di klien

---

## Tahap 3 — Page Super Admin

Prasyarat: tahap 2 selesai (guard + pola tabel data sudah terbentuk).

Portal di bawah `/super-admin`, hanya `SUPER_ADMIN`. Padanan
`lib/features/superadmin/`.

1. **Guard & shell** — navigasi lintas desa, bukan per Kopdes
2. **Ikhtisar** (`/super-admin`) — `GET /super-admin/overview`: jumlah akun
   per peran, pesanan, koperasi
3. **Akun staf** (`/super-admin/staf`) — CRUD `ADMIN_KOPDES` /
   `PEGAWAI_KOPDES`, **termasuk field `kopdesId` dan `permissions`** yang
   endpoint-nya sudah menerima tapi belum punya UI di mana pun
4. **Direktori pengguna** (`/super-admin/pengguna`) — filter peran + pencarian
5. **Kelola Koperasi** — daftar Kopdes, jam operasional, koordinat,
   verifikasi. Belum ada endpoint CRUD Koperasi; **buat dulu di backend**
6. **Audit log** — `AuditLog` sudah terisi dari order/delivery/inventory/
   product. Belum ada endpoint pembacanya; **buat dulu di backend**

---

## Yang harus dibuat di backend lebih dulu

| Untuk | Endpoint yang belum ada |
|---|---|
| Tahap 3 · Kelola Koperasi | CRUD `Koperasi` (kini hanya dibaca `/koperasi`) |
| Tahap 3 · Audit log | Pembaca `AuditLog` dengan filter aktor/aksi/tanggal |
| Tahap 1b · Ubah ulasan | `PATCH /reviews/:id` sudah ada, UI-nya belum |
| Tahap 2 · Nama toko di keranjang | `GET /cart` belum mengirim nama penjual per baris, sehingga grup keranjang web masih memakai jenis penjual sebagai nama |

## Menjalankan

```bash
cd website/app
cp .env.local.example .env.local     # atur NEXT_PUBLIC_API_URL
npm install
npm run dev                          # http://localhost:3000
```

Backend NestJS default juga di port 3000 — jalankan backend di port lain
(`PORT=3001 npm run start:dev`) dan set
`NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`.

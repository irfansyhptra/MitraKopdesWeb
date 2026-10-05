# Paritas aplikasi dan website KMP Mitra

Website memakai `NEXT_PUBLIC_API_URL` dan klien bersama di `shared/api.ts`. Semua route di bawah memanggil endpoint NestJS `/api/v1` yang sama dengan service Flutter; alias route mempertahankan tautan aplikasi tanpa menggandakan tampilan.

| Peran | Halaman web | Endpoint utama |
|---|---|---|
| Pelanggan | `/`, `/marketplace`, `/products`, `/product/:id`, `/umkm-product/:id` | `/marketplace/products`, `/products/:id`, `/umkm/products/:id`, `/banners`, `/products/best-sellers` |
| Pelanggan | `/koperasi`, `/kopdes/:id`, `/mitra`, `/mitra/:id` | `/koperasi`, `/koperasi/:id`, `/umkm`, `/umkm/:id`, `/marketplace/products?umkmId=...` |
| Pelanggan | `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/tracking/:id` | `/cart/*`, `/orders/*`, `/payments/*`, `/deliveries/:id/tracking` |
| Pelanggan | `/profile`, `/profile/alamat`, `/membership/register` | `/auth/me`, `/addresses`, `/koperasi/:id/members/*` |
| Pelanggan | `/register`, `/verify-email` | `/auth/register`, `/auth/verify-email`, `/auth/resend-verification` |
| Semua pengguna | `/chat`, `/chat/seller/:id`, `/chat/courier/:id` | `/chat/conversations`, `/chat/conversations/:id/messages`, `/chat/conversations/:id/read` |
| UMKM | `/umkm`, `/umkm/products`, `/umkm/orders`, `/umkm/profile` | `/seller/dashboard`, `/seller/products`, `/seller/inventory/adjust`, `/seller/orders`, `/seller/profile` |
| Kurir | `/courier` | `/courier/deliveries`, `/courier/deliveries/:id/location`, `/courier/deliveries/:id/mark-delivered` |
| Admin/Pegawai Kopdes | `/pegawai/*` dan alias `/admin/*` | `/admin/dashboard/*`, `/admin/orders`, `/admin/deliveries`, `/admin/inventory/*`, `/admin/finance/*`, `/admin/staff`, `/admin/members` |
| Admin Kopdes | `/pegawai/mitra`, `/pegawai/moderasi`, `/pegawai/lokasi-mitra`, `/pegawai/kategori` | `/admin/umkm`, `/admin/umkm/:id/verify`, `/admin/umkm/products/:id/takedown`, `/admin/umkm/:id/location`, `/categories` |
| Super Admin | `/super-admin/*` | `/super-admin/overview`, `/super-admin/applications`, `/super-admin/kopdes`, `/super-admin/accounts`, `/super-admin/users` |

Route aplikasi yang memakai nama berbeda tersedia sebagai alias: `/home`, `/products`, `/products/detail/:id`, `/orders/history`, `/koperasi`, `/mitra/products/:id`, `/admin/products/new`, dan `/admin/products/edit/:id`.

Fitur yang belum mempunyai endpoint backend tidak membuat data contoh di website. Saat ini itu mencakup notifikasi dan pengiriman email pemulihan kata sandi. Halaman pemulihan menjelaskan kondisi tersebut, sedangkan notifikasi belum diberi daftar semu agar keadaan aplikasi dan website tidak tampak tersinkron padahal datanya hanya lokal.

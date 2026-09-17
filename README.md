# KOPDES — Website Frontend

Frontend web KOPDES, terpisah dari aplikasi Flutter (mobile/desktop). Terdiri
dari **dua aplikasi Next.js** yang berbagi satu backend NestJS (`/api/v1`).

```
website/
  landing/   # Landing page promosi (Next.js SSG, output statis) — SEO
  app/       # Marketplace + dashboard pengguna (Next.js App Router, JWT)
  shared/    # Klien API + tipe TypeScript bersama (framework-agnostic)
```

## Prasyarat
- Node.js ≥ 18
- Backend KOPDES berjalan (lokal atau `https://backend-kopdes.vercel.app/api/v1`)

## Menjalankan

### 1. Landing (promo) — port 3100
```bash
cd website/landing
npm install
npm run dev        # http://localhost:3100
```
Tautan CTA mengarah ke app via `NEXT_PUBLIC_APP_URL` (default `http://localhost:3000`).

### 2. App (marketplace + dashboard) — port 3000
```bash
cd website/app
cp .env.local.example .env.local   # atur NEXT_PUBLIC_API_URL
npm install
npm run dev        # http://localhost:3000
```

> ⚠️ Backend NestJS default juga di port 3000. Untuk pengembangan lokal,
> jalankan backend di port lain (mis. `PORT=3001 npm run start:dev`) dan set
> `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`.

## Integrasi backend
- Envelope respons: `{ success, data }` — di-unwrap di `shared/api.ts`.
- Auth: `POST /auth/login` → JWT disimpan di `localStorage` (`app/lib/auth.ts`),
  lalu dikirim sebagai `Authorization: Bearer`.
- Registrasi hanya untuk CUSTOMER/UMKM/COURIER (dibatasi backend).

## Yang sudah ada (scaffold)
- **landing**: hero, daftar fitur, CTA, metadata SEO/OpenGraph, output statis.
- **app**: marketplace (SSR daftar produk publik), halaman login, dashboard
  pengguna terlindungi (`/auth/me`).

## Selanjutnya (belum dibuat)
Detail produk, keranjang/checkout, riwayat pesanan, dashboard per-peran
(UMKM/kurir/admin) — dibangun di `app/` mengikuti pola yang sama.

## Deploy
Kedua app cocok untuk Vercel (satu project per folder). `landing` menghasilkan
statis (`next build` → `out/`); `app` berjalan sebagai app Next.js biasa.

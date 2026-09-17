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

Repo ini satu **npm workspace**: `npm install` dijalankan sekali di root
`website/`, bukan di tiap app. Dependency di-hoist ke `website/node_modules`.

```bash
cd website
npm install                        # sekali, untuk kedua app

cp app/.env.local.example app/.env.local   # atur NEXT_PUBLIC_API_URL

npm run dev            # app pelanggan  → http://localhost:3000
npm run dev:landing    # landing promo  → http://localhost:3100

npm run build          # build kedua app
npm run typecheck      # tsc --noEmit di kedua app
npm run lint           # eslint di app, landing, shared, dan test
npm test               # vitest (jsdom + Testing Library)
npm run test:watch     # vitest mode tonton
```

> Next 16 memakai Turbopack sebagai bundler bawaan dan `next lint` sudah
> dihapus dari CLI-nya, jadi ESLint dipasang langsung: satu `eslint.config.mjs`
> (flat config) di akar workspace untuk `app`, `landing`, dan `shared`.
> `tsc` menjaga tipe, ESLint menjaga yang luput dari tipe — dependensi hook
> yang kurang dan aturan khusus Next.
>
> Aturan `react-hooks/set-state-in-effect` dimatikan dengan sengaja: halaman
> klien di sini memuat datanya sendiri di `useEffect`, dan memindahkannya ke
> server component atau Suspense adalah keputusan arsitektur tersendiri,
> bukan perbaikan lint.

### Tes

Satu `vitest.config.mts` di akar workspace, berkas tes di `test/`. Yang diuji
adalah bagian yang diam-diam salah kalau rusak, bukan setiap komponen:

| Berkas | Menjaga |
|---|---|
| `test/format.test.ts` | Jalur uang — `Decimal` string dari backend, pemisah ribuan, diskon yang tidak boleh melebihi nilai barang |
| `test/api-client.test.ts` | Bentuk pesan galat Nest (string / array / objek) dan envelope `/ai/chat` |
| `test/ai-assistant.test.tsx` | Mesin efek ketik: jawaban berpindah ke daftar pesan setelah selesai ditulis, dan kirim terkunci selama itu |

Tes tidak ikut `tsc`: vitest menjalankannya langsung, jadi impor yang salah
gagal seketika saat tes dijalankan.

Tautan CTA landing mengarah ke app via `NEXT_PUBLIC_APP_URL`
(default `http://localhost:3000`).

> ⚠️ Backend NestJS default juga di port 3000. Untuk pengembangan lokal,
> jalankan backend di port lain (mis. `PORT=3001 npm run start:dev`) dan set
> `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`.

## Integrasi backend
- Envelope respons: `{ success, data }` — di-unwrap di `shared/api.ts`.
- Auth: `POST /auth/login` → JWT disimpan di `localStorage` (`app/lib/auth.ts`),
  lalu dikirim sebagai `Authorization: Bearer`.
- Registrasi hanya untuk CUSTOMER/UMKM/COURIER (dibatasi backend).

## Design system
Token dan komponen diambil dari aplikasi Flutter lewat `shared/design/`:
`tokens.css` (padanan `lib/core/theme/theme.dart`), `components.css` dan
`ui.tsx` (padanan `lib/shared/widgets/apple_ui.dart`). **Jangan menulis
warna, spacing, atau radius langsung di halaman** — web dan mobile harus
memakai angka yang sama, bukan angka yang mirip.

## Status & urutan pengerjaan
Lihat [`ROADMAP.md`](./ROADMAP.md). Ringkasnya: fondasi + beranda,
marketplace, dan halaman Pesanan sudah jadi; sisa page user, lalu portal
Pegawai Kopdes, lalu Super Admin.

## Deploy
Kedua app cocok untuk Vercel (satu project per folder). `landing` menghasilkan
statis (`next build` → `out/`); `app` berjalan sebagai app Next.js biasa.

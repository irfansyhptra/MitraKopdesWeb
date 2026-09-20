/**
 * Unggah gambar langsung dari peramban ke Cloudinary.
 *
 * Berkasnya tidak melewati server kita sama sekali: peramban meminta tanda
 * tangan ke backend NestJS, lalu mengunggah sendiri ke Cloudinary. Setelah
 * itu hanya URL-nya yang dikirim balik untuk disimpan.
 *
 * Penandatanganan ada di backend, bukan di route handler Next, karena di
 * sanalah kredensial Cloudinary tinggal — satu tempat, bukan dua salinan
 * yang bisa berbeda. Endpoint-nya juga sudah punya penjaga peran dan
 * permission yang sama dengan endpoint barang.
 *
 * Lewat server akan menabrak batas badan permintaan 4,5 MB pada fungsi
 * serverless Vercel — satu foto ponsel saja sering melampauinya.
 */

/** Batas Cloudinary paket gratis, dicek di klien agar galatnya cepat terbaca. */
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

import { api } from './api';

export class UploadError extends Error {}

/**
 * Mengunggah beberapa berkas dan mengembalikan URL-nya, berurutan sesuai
 * masukan — urutan menentukan mana yang jadi gambar utama.
 */
export async function uploadImages(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];

  for (const file of files) {
    if (!ALLOWED.includes(file.type)) {
      throw new UploadError(
        `"${file.name}" bukan gambar JPG, PNG, atau WebP.`,
      );
    }
    if (file.size > MAX_BYTES) {
      throw new UploadError(
        `"${file.name}" lebih dari 10 MB. Perkecil dulu gambarnya.`,
      );
    }
  }

  const sig = await api.getUploadSignature().catch((e: Error) => {
    throw new UploadError(
      e.message || 'Penyimpanan gambar sedang tidak bisa dihubungi.',
    );
  });
  const endpoint = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;

  // Berurutan, bukan Promise.all: koneksi desa sering tipis, dan lima
  // unggahan serentak saling berebut sampai ketiganya gagal timeout.
  const urls: string[] = [];
  for (const file of files) {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('folder', sig.folder);
    form.append('signature', sig.signature);

    const res = await fetch(endpoint, { method: 'POST', body: form });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.secure_url) {
      throw new UploadError(
        body?.error?.message ?? `Gagal mengunggah "${file.name}".`,
      );
    }
    // secure_url, bukan url: yang kedua http, dan halaman https akan
    // menolak memuatnya sebagai mixed content.
    urls.push(body.secure_url as string);
  }

  return urls;
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { PaymentSnapshot, PaymentView } from '@shared/api';

/** Status yang tidak berubah lagi; polling berhenti begitu salah satunya tiba. */
const FINAL: PaymentView[] = [
  'PAID',
  'DENIED',
  'CANCELLED',
  'EXPIRED',
  'FAILED',
  'REFUNDED',
];

export const isFinalStatus = (view: PaymentView) => FINAL.includes(view);

/**
 * Status pembayaran satu pesanan.
 *
 * Polling **terbatas**, bukan tanpa akhir:
 *
 *  - Jedanya menaik (5s → 30s). Menanyakan tiap detik selama sepuluh menit
 *    berarti enam ratus permintaan untuk satu pembayaran, dan Midtrans tetap
 *    tidak menjawab lebih cepat karenanya.
 *  - Berhenti begitu statusnya final atau halamannya ditutup.
 *  - Berhenti setelah batas percobaan; webhook tetap memperbarui database,
 *    dan pengguna masih punya tombol "Cek Status".
 *
 * Ikut menyegarkan saat tab kembali terlihat: pengguna yang baru selesai
 * membayar di aplikasi e-wallet kembali ke sini dan mengharapkan statusnya
 * sudah berubah — tapi yang menentukan tetap jawaban server, bukan fakta
 * bahwa ia kembali.
 */
export function usePaymentStatus(orderId: string, enabled = true) {
  const [data, setData] = useState<PaymentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  const MAX_ATTEMPTS = 40;

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  /** Membaca dari database kita — murah, dan webhook yang mengisinya. */
  const read = useCallback(async () => {
    try {
      const snap = await api.getPayment(orderId);
      if (!alive.current) return null;
      setData(snap);
      setError(null);
      return snap;
    } catch (e) {
      if (alive.current) setError((e as Error).message);
      return null;
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [orderId]);

  /** Menanyakan ke Midtrans — dipakai tombol, dan sesekali oleh polling. */
  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const snap = await api.checkPaymentStatus(orderId);
      if (!alive.current) return null;
      setData(snap);
      setError(null);
      return snap;
    } catch (e) {
      // Gagal menanyakan bukan berarti gagal membayar; status terakhir yang
      // diketahui tetap ditampilkan.
      if (alive.current) setError((e as Error).message);
      return null;
    } finally {
      if (alive.current) setChecking(false);
    }
  }, [orderId]);

  useEffect(() => {
    alive.current = true;
    if (!enabled) return;

    const tick = async () => {
      const snap = attempts.current % 4 === 3 ? await refresh() : await read();
      attempts.current += 1;

      if (!alive.current) return;
      if (snap && isFinalStatus(snap.status)) return;
      if (attempts.current >= MAX_ATTEMPTS) return;

      // 5s untuk tiga percobaan pertama, lalu melebar sampai 30s.
      const delay = Math.min(5000 + attempts.current * 2000, 30_000);
      timer.current = setTimeout(() => void tick(), delay);
    };

    void tick();

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (data && isFinalStatus(data.status)) return;
      void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive.current = false;
      stop();
      document.removeEventListener('visibilitychange', onVisible);
    };
    // `data` sengaja tidak ikut: memasukkannya membuat polling dimulai ulang
    // setiap kali statusnya berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, enabled, read, refresh, stop]);

  return { data, loading, checking, error, refresh, reload: read };
}

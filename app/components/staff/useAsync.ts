'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Pemuat satu bagian dashboard.
 *
 * Tiap seksi memakai instansnya sendiri, bukan satu permintaan besar untuk
 * seluruh halaman: rekap keuangan yang gagal tidak boleh mengosongkan kartu
 * pesanan, dan satu endpoint yang lambat tidak boleh menahan yang lain.
 * Aturan yang sama tertulis di dashboard Flutter-nya.
 */
export interface Async<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): Async<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // This custom hook intentionally accepts its caller's dependency list.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
  const run = useCallback(fetcher, deps);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    run()
      .then((value) => !cancelled && setData(value))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [run]);

  const [nonce, setNonce] = useState(0);
  useEffect(() => load(), [load, nonce]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}

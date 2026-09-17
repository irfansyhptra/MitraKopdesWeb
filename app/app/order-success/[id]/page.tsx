'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, SectionHeader } from '@shared/design/ui';

/**
 * Konfirmasi pesanan dibuat — padanan `OrderSuccessScreen`.
 *
 * Sengaja tidak memuat ulang pesanan: yang dibutuhkan pemesan di sini hanya
 * kepastian bahwa pesanannya tercatat, plus jalan menuju detailnya.
 */
export default function OrderSuccessPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <Card className="stack-md">
        <div style={{ textAlign: 'center' }}>
          <div
            aria-hidden="true"
            style={{
              width: 64,
              height: 64,
              margin: '0 auto var(--sp-md)',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              fontSize: 30,
              background: 'var(--kopdes-surface)',
              color: 'var(--kopdes-text)',
            }}
          >
            ✓
          </div>
          <h1 className="t-title-lg" style={{ fontWeight: 700 }}>
            Pesanan Berhasil Dibuat
          </h1>
          <p className="t-caption" style={{ marginTop: 4 }}>
            Terima kasih! Pesananmu sudah tercatat di sistem koperasi dan
            menunggu diproses.
          </p>
        </div>

        <SectionHeader title="Langkah berikutnya" />
        <ul className="stack-sm" style={{ listStyle: 'none' }}>
          <li className="t-body-md">
            1. Selesaikan pembayaran bila memilih QRIS.
          </li>
          <li className="t-body-md">
            2. Kopdes menyiapkan barangmu.
          </li>
          <li className="t-body-md">
            3. Ambil di tempat atau tunggu kurir desa mengantar.
          </li>
        </ul>

        <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap' }}>
          <Link href={`/orders/${id}`} className="kc-btn kc-btn--primary">
            Lihat Detail Pesanan
          </Link>
          <Link href="/marketplace" className="kc-btn kc-btn--secondary">
            Belanja Lagi
          </Link>
        </div>
      </Card>
    </div>
  );
}

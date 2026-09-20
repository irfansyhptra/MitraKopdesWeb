'use client';

import { useState } from 'react';
import { Card } from '@shared/design/ui';
import { ExternalLink } from '@shared/design/icons';
import { methodInfo } from './methods';
import type { PaymentSnapshot } from '@shared/api';

/**
 * Instruksi e-wallet (GoPay, ShopeePay).
 *
 * Dua jalur, dan keduanya dipakai di tempat yang berbeda:
 *
 *  - **Deep link** untuk ponsel yang punya aplikasinya.
 *  - **QR** untuk desktop dan tablet, atau ponsel tanpa aplikasi itu.
 *
 * Tautannya selalu dari `actions` Midtrans. Menyusun deep link sendiri
 * berarti menebak format yang bisa berubah kapan saja tanpa pemberitahuan.
 */
export function EwalletView({ payment }: { payment: PaymentSnapshot }) {
  const info = methodInfo(payment.method);
  const [opened, setOpened] = useState(false);

  const hasDeeplink = Boolean(payment.deeplinkUrl);
  const hasQr = Boolean(payment.qrCodeUrl);

  if (!hasDeeplink && !hasQr) {
    return (
      <Card className="stack-sm">
        <p className="t-body-md">
          Tautan pembayaran belum tersedia dari penyedia.
        </p>
        <p className="t-caption-sm">
          Tekan Cek Status; bila tetap kosong, pilih metode lain.
        </p>
      </Card>
    );
  }

  return (
    <Card className="stack-md">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-md)' }}>
        <span
          className="kc-method__logo"
          style={{ ['--method-tint' as string]: info?.tint }}
          aria-hidden="true"
        >
          {info?.short}
        </span>
        <div>
          <p className="kc-method__name">{info?.name ?? 'Dompet Digital'}</p>
          <p className="kc-method__desc">{info?.description}</p>
        </div>
      </div>

      {hasQr && (
        <div className="kc-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={payment.qrCodeUrl!}
            alt={`Kode QR ${info?.name ?? 'pembayaran'}`}
          />
        </div>
      )}

      {hasDeeplink && (
        <>
          <a
            className="kc-btn kc-btn--primary kc-btn--block"
            href={payment.deeplinkUrl!}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpened(true)}
          >
            <ExternalLink size={15} aria-hidden="true" /> Buka Aplikasi{' '}
            {info?.name}
          </a>

          {/* Aplikasi yang tidak terpasang membuat deep link tidak melakukan
              apa-apa — tanpa keterangan ini pengguna mengira tombolnya rusak. */}
          {opened && (
            <p className="t-caption-sm">
              Tidak terjadi apa-apa? Berarti aplikasi {info?.name} belum
              terpasang di perangkat ini.{' '}
              {hasQr
                ? 'Pindai kode QR di atas dari perangkat lain yang punya aplikasinya.'
                : 'Pasang aplikasinya lebih dulu, atau kembali dan pilih metode lain.'}
            </p>
          )}
        </>
      )}

      <div>
        <p className="kc-copy__label" style={{ marginBottom: 'var(--sp-sm)' }}>
          CARA MEMBAYAR
        </p>
        <ol className="kc-steps">
          {hasDeeplink && <li>Tekan tombol di atas untuk membuka aplikasinya.</li>}
          {hasQr && <li>Atau pindai kode QR dari perangkat lain.</li>}
          <li>Periksa nama penerima dan nominalnya.</li>
          <li>Selesaikan pembayaran di aplikasi.</li>
          <li>
            Kembali ke halaman ini — statusnya diambil dari server, bukan dari
            fakta bahwa Anda kembali.
          </li>
        </ol>
      </div>
    </Card>
  );
}

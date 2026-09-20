'use client';

import { useEffect, useState } from 'react';
import { formatRupiah } from '@shared/format';
import type { PaymentMethodCode } from '@shared/api';
import {
  METHOD_GROUPS,
  PAYMENT_METHODS,
  lastMethod,
  type PaymentMethodInfo,
} from './methods';

/**
 * Pemilih metode pembayaran.
 *
 * Dikelompokkan supaya daftar delapan metode tetap terbaca, dan metode yang
 * terakhir dipakai ditandai — pembeli yang sama biasanya membayar dengan cara
 * yang sama, dan mencarinya lagi tiap kali hanya menambah langkah.
 */
export function MethodPicker({
  value,
  onChange,
  amount,
  /** Metode yang untuk sementara tidak bisa dipakai, beserta alasannya. */
  unavailable = {},
}: {
  value: PaymentMethodCode | null;
  onChange: (code: PaymentMethodCode) => void;
  amount: number;
  unavailable?: Partial<Record<PaymentMethodCode, string>>;
}) {
  const [recent, setRecent] = useState<PaymentMethodCode | null>(null);

  useEffect(() => setRecent(lastMethod()), []);

  return (
    <div className="stack-md">
      {METHOD_GROUPS.map((group) => {
        const methods = PAYMENT_METHODS.filter((m) => m.group === group.id);
        if (methods.length === 0) return null;

        return (
          <div key={group.id}>
            <p
              className="kc-copy__label"
              style={{ marginBottom: 'var(--sp-sm)' }}
            >
              {group.label.toUpperCase()}
            </p>
            <div className="stack-sm" role="radiogroup" aria-label={group.label}>
              {methods.map((method) => (
                <MethodRow
                  key={method.code}
                  method={method}
                  selected={value === method.code}
                  recent={recent === method.code}
                  disabledReason={unavailable[method.code]}
                  amount={amount}
                  onSelect={() => onChange(method.code)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MethodRow({
  method,
  selected,
  recent,
  disabledReason,
  amount,
  onSelect,
}: {
  method: PaymentMethodInfo;
  selected: boolean;
  recent: boolean;
  disabledReason?: string;
  amount: number;
  onSelect: () => void;
}) {
  const disabled = Boolean(disabledReason);

  return (
    <button
      type="button"
      role="radio"
      className="kc-method"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      <span
        className="kc-method__logo"
        style={{ ['--method-tint' as string]: method.tint }}
        aria-hidden="true"
      >
        {method.short}
      </span>

      <span className="kc-method__body">
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-sm)',
            flexWrap: 'wrap',
          }}
        >
          <span className="kc-method__name">{method.name}</span>
          {recent && !disabled && (
            <span className="kc-badge kc-badge--primary">Terakhir dipakai</span>
          )}
          {/* Alasan tidak tersedia ditulis, bukan sekadar tombol yang mati —
              tombol mati tanpa keterangan terbaca sebagai aplikasi rusak. */}
          {disabled && <span className="kc-badge kc-badge--muted">{disabledReason}</span>}
        </span>
        <span className="kc-method__desc">{method.description}</span>
        {method.fee && (
          <span className="kc-method__desc" style={{ color: 'var(--warning)' }}>
            Biaya tambahan {method.fee} · total {formatRupiah(amount)}
          </span>
        )}
      </span>

      <span className="kc-method__radio" aria-hidden="true" />
    </button>
  );
}

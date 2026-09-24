/**
 * Primitif UI bersama — padanan React dari `lib/shared/widgets/apple_ui.dart`.
 *
 * Komponennya sengaja tipis: hanya membungkus kelas di `components.css`
 * supaya satu perubahan token berlaku di web maupun mobile tanpa ada
 * salinan angka kedua di dalam TSX.
 */

import type { ReactNode } from 'react';

export type SellerKind = 'KOPDES' | 'UMKM';

// ── Kartu & grup ─────────────────────────────────────────────────────────

export function Card({
  children,
  pad = true,
  flat = false,
  className = '',
}: {
  children: ReactNode;
  pad?: boolean;
  flat?: boolean;
  className?: string;
}) {
  const classes = [
    'kc-card',
    pad ? 'kc-card--pad' : '',
    flat ? 'kc-card--flat' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <div className={classes}>{children}</div>;
}

/** Daftar dengan pemisah tipis antar baris — bukan satu kartu per baris. */
export function ListGroup({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`kc-group ${className}`.trim()}>{children}</div>;
}

export function SectionHeader({
  title,
  actionLabel,
  onAction,
  href,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
}) {
  return (
    <div className="kc-section-head">
      <h2 className="kc-section-head__title">{title}</h2>
      {actionLabel && href && (
        <a className="kc-section-head__action" href={href}>
          {actionLabel}
        </a>
      )}
      {actionLabel && !href && onAction && (
        <button type="button" className="kc-section-head__action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ── Lencana ──────────────────────────────────────────────────────────────

export function Badge({
  children,
  variant = 'muted',
}: {
  children: ReactNode;
  variant?: 'kopdes' | 'umkm' | 'primary' | 'success' | 'warning' | 'muted';
}) {
  return <span className={`kc-badge kc-badge--${variant}`}>{children}</span>;
}

/**
 * Lencana jenis penjual.
 *
 * Teksnya ditulis, bukan hanya dibedakan warna — hijau/ungu saja tidak bisa
 * dibaca pengguna yang buta warna, dan itu satu-satunya penanda apakah barang
 * berasal dari Kopdes atau mitra UMKM.
 */
export function SellerBadge({ kind }: { kind: SellerKind }) {
  return kind === 'KOPDES' ? (
    <Badge variant="kopdes">KOPDES</Badge>
  ) : (
    <Badge variant="umkm">MITRA UMKM</Badge>
  );
}

// ── Kontrol ──────────────────────────────────────────────────────────────

export function Button({
  children,
  variant = 'primary',
  block = false,
  disabled = false,
  onClick,
  type = 'button',
  ariaLabel,
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  block?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      className={`kc-btn kc-btn--${variant} ${block ? 'kc-btn--block' : ''}`.trim()}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  children,
  href,
  variant = 'primary',
  block = false,
}: {
  children: ReactNode;
  href: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  block?: boolean;
}) {
  return (
    <a
      href={href}
      className={`kc-btn kc-btn--${variant} ${block ? 'kc-btn--block' : ''}`.trim()}
    >
      {children}
    </a>
  );
}

export function Chip({
  children,
  selected = false,
  onClick,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="kc-chip"
      // `aria-pressed`, bukan `aria-selected`: yang terakhir hanya sah pada
      // peran tab/option/gridcell/row, sementara ini tombol biasa. Atributnya
      // sekaligus jadi penanda gaya, jadi tidak ada kelas terpisah yang bisa
      // berbeda dari status yang dibacakan pembaca layar.
      aria-pressed={selected}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/**
 * Stepper jumlah.
 *
 * Minimum 1: tombol kurang pada jumlah 1 tidak menghasilkan 0 melainkan
 * mati, karena menghapus barang adalah tindakan tersendiri yang punya
 * konfirmasinya. Maksimum mengikuti stok.
 */
export function QuantityStepper({
  value,
  stock,
  busy = false,
  onChange,
  productName,
}: {
  value: number;
  stock: number;
  busy?: boolean;
  onChange: (next: number) => void;
  productName: string;
}) {
  const canDecrease = value > 1 && !busy;
  const canIncrease = value < Math.max(stock, 1) && !busy;

  return (
    <div className="kc-stepper">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        aria-label={`Kurangi jumlah ${productName}`}
      >
        −
      </button>
      <span className="kc-stepper__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        aria-label={`Tambah jumlah ${productName}`}
      >
        +
      </button>
    </div>
  );
}

// ── Tab tersegmentasi ────────────────────────────────────────────────────

export interface TabItem<T extends string> {
  id: T;
  label: string;
  badge?: number;
}

export function SegmentedTabs<T extends string>({
  items,
  active,
  onSelect,
  label,
}: {
  items: TabItem<T>[];
  active: T;
  onSelect: (id: T) => void;
  label: string;
}) {
  return (
    <div className="kc-tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          className="kc-tab"
          aria-selected={item.id === active}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
          {/* Nol berarti lencana tidak digambar sama sekali, bukan bulatan
              berisi "0". */}
          {!!item.badge && item.badge > 0 && (
            <span className="kc-tab__badge">{item.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Keadaan memuat, kosong, galat ────────────────────────────────────────

export function Skeleton({
  height,
  width,
  radius,
}: {
  height: number | string;
  width?: number | string;
  radius?: number;
}) {
  return (
    <div
      className="kc-skeleton"
      style={{ height, width: width ?? '100%', borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

/** Skeleton kartu produk — ukurannya disamakan dengan kartu aslinya supaya
 *  tata letak tidak melompat begitu data datang. */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="kc-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="kc-product" key={i}>
          <div className="kc-product__media">
            <Skeleton height="100%" radius={0} />
          </div>
          <div className="kc-product__body">
            <Skeleton height={13} />
            <Skeleton height={13} width="70%" />
            <Skeleton height={15} width="50%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Message({
  title,
  body,
  actionLabel,
  onAction,
  href,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
}) {
  return (
    <div className="kc-message">
      <p className="kc-message__title">{title}</p>
      {body && <p className="kc-message__body">{body}</p>}
      {actionLabel && href && (
        <LinkButton href={href} variant="primary">
          {actionLabel}
        </LinkButton>
      )}
      {actionLabel && !href && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

// ── Baris nominal ────────────────────────────────────────────────────────

export function MoneyLine({
  label,
  value,
  total = false,
  accent,
}: {
  label: string;
  value: string;
  total?: boolean;
  accent?: 'success';
}) {
  return (
    <div className={`kc-line ${total ? 'kc-line--total' : ''}`.trim()}>
      <span className="kc-line__label">{label}</span>
      <span
        className="kc-line__value"
        style={accent === 'success' ? { color: 'var(--success)' } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  ListGroup,
  Message,
  QuantityStepper,
  SellerBadge,
  Skeleton,
  type SellerKind,
} from '@shared/design/ui';
import { formatRupiah, toRupiah } from '@shared/format';
import type { Cart, CartItem } from '@shared/api';

/**
 * Subpage Keranjang — padanan `CartSellerGroup` + pilihan produk pada
 * aplikasi Flutter.
 *
 * Produk dikelompokkan per penjual (Kopdes atau Mitra UMKM), bukan sebagai
 * kartu lepas tanpa identitas toko: satu keranjang bisa memuat barang dari
 * beberapa toko, dan pembeli perlu tahu mana milik siapa.
 */

export type CheckState = 'none' | 'partial' | 'all';

export interface SellerGroup {
  key: string;
  kind: SellerKind;
  name: string;
  items: CartItem[];
}

function lineTotal(item: CartItem): number {
  const source = item.product ?? item.umkmProduct;
  return toRupiah(source?.price) * item.quantity;
}

function itemStock(item: CartItem): number {
  const source = item.product ?? item.umkmProduct;
  const stock = (source as { stock?: number } | null | undefined)?.stock;
  return typeof stock === 'number' ? stock : 0;
}

function itemName(item: CartItem): string {
  return item.product?.name ?? item.umkmProduct?.name ?? 'Produk';
}

function itemImage(item: CartItem): string | null {
  const source = item.product ?? item.umkmProduct;
  const images = source?.images ?? [];
  const primary = images.find((i) => i.isPrimary) ?? images[0];
  return primary?.url ?? null;
}

/** Mengelompokkan baris keranjang per toko, dengan urutan yang tetap. */
export function groupBySeller(cart: Cart | null): SellerGroup[] {
  if (!cart) return [];
  const map = new Map<string, SellerGroup>();

  for (const item of cart.items) {
    const isUmkm = !!item.umkmProduct;
    // Nama toko belum selalu ikut di payload keranjang; sampai ada, barisnya
    // dikelompokkan per jenis penjual alih-alih berserakan tanpa identitas.
    const kind: SellerKind = isUmkm ? 'UMKM' : 'KOPDES';
    const key = kind;
    const name = isUmkm ? 'Mitra UMKM' : 'Kopdes Merah Putih';

    const existing = map.get(key);
    if (existing) existing.items.push(item);
    else map.set(key, { key, kind, name, items: [item] });
  }

  return [...map.values()];
}

export function checkStateOf(
  ids: string[],
  selected: Set<string>,
): CheckState {
  if (ids.length === 0) return 'none';
  const count = ids.filter((id) => selected.has(id)).length;
  if (count === 0) return 'none';
  return count === ids.length ? 'all' : 'partial';
}

/**
 * Checkbox tiga keadaan.
 *
 * `indeterminate` tidak bisa disetel lewat atribut HTML, hanya lewat
 * properti DOM — itulah alasan `ref` di sini. Tanpa itu, melepas satu produk
 * membuat checkbox toko terlihat penuh, padahal isinya tidak semua terpilih.
 */
function TriCheckbox({
  state,
  onChange,
  label,
}: {
  state: CheckState;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <span className="checkbox">
      <input
        type="checkbox"
        checked={state === 'all'}
        ref={(el) => {
          if (el) el.indeterminate = state === 'partial';
        }}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
        aria-checked={state === 'partial' ? 'mixed' : state === 'all'}
      />
    </span>
  );
}

export function CartTab({
  cart,
  loading,
  error,
  selected,
  busyItems,
  onToggleItem,
  onToggleGroup,
  onQuantity,
  onRemove,
  onRetry,
}: {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  selected: Set<string>;
  busyItems: Set<string>;
  onToggleItem: (id: string, next: boolean) => void;
  onToggleGroup: (ids: string[], next: boolean) => void;
  onQuantity: (item: CartItem, next: number) => void;
  onRemove: (item: CartItem) => void;
  onRetry: () => void;
}) {
  const groups = useMemo(() => groupBySeller(cart), [cart]);

  if (loading) {
    return (
      <div className="stack-md">
        {[0, 1].map((i) => (
          <div className="kc-card kc-card--pad stack-sm" key={i}>
            <Skeleton height={16} width="45%" />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Message
        title="Pesanan belum berhasil dimuat"
        body={error}
        actionLabel="Coba Lagi"
        onAction={onRetry}
      />
    );
  }

  if (groups.length === 0) {
    return (
      <Message
        title="Keranjangmu masih kosong"
        body="Temukan produk Kopdes dan UMKM pilihan untuk kebutuhanmu."
        actionLabel="Mulai Belanja"
        href="/marketplace"
      />
    );
  }

  return (
    <div className="stack-md">
      {groups.map((group) => {
        const ids = group.items.map((i) => i.id);
        const state = checkStateOf(ids, selected);

        return (
          <ListGroup key={group.key}>
            <div className="sellergroup__head">
              <TriCheckbox
                state={state}
                onChange={(next) => onToggleGroup(ids, next)}
                label={`Pilih semua produk dari ${group.name}`}
              />
              <SellerBadge kind={group.kind} />
              <Badge variant="success">✓ Terverifikasi</Badge>
              <span className="sellergroup__name">{group.name}</span>
              <button
                type="button"
                className="kc-btn kc-btn--ghost"
                onClick={() => onToggleGroup(ids, state !== 'all')}
              >
                {state === 'all' ? 'Batal Pilih' : 'Pilih Semua'}
              </button>
            </div>

            {group.items.map((item) => (
              <CartRow
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                busy={busyItems.has(item.id)}
                onToggle={(next) => onToggleItem(item.id, next)}
                onQuantity={(next) => onQuantity(item, next)}
                onRemove={() => onRemove(item)}
              />
            ))}
          </ListGroup>
        );
      })}
    </div>
  );
}

function CartRow({
  item,
  selected,
  busy,
  onToggle,
  onQuantity,
  onRemove,
}: {
  item: CartItem;
  selected: boolean;
  busy: boolean;
  onToggle: (next: boolean) => void;
  onQuantity: (next: number) => void;
  onRemove: () => void;
}) {
  const name = itemName(item);
  const stock = itemStock(item);
  const image = itemImage(item);

  return (
    <div className="cartrow">
      <TriCheckbox
        state={selected ? 'all' : 'none'}
        onChange={onToggle}
        label={`Pilih ${name}`}
      />

      <div className="cartrow__thumb">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} loading="lazy" />
        ) : (
          <span aria-hidden="true">📦</span>
        )}
      </div>

      <div className="cartrow__body">
        <p className="cartrow__name">{name}</p>
        <p className="t-caption-sm">
          {stock > 0 ? `Stok ${stock} tersedia` : 'Stok habis'}
        </p>
        <div className="cartrow__foot">
          <span className="cartrow__price">
            {formatRupiah(lineTotal(item))}
          </span>
          <QuantityStepper
            value={item.quantity}
            stock={stock}
            busy={busy}
            productName={name}
            onChange={onQuantity}
          />
        </div>
      </div>

      <button
        type="button"
        className="icon-btn"
        onClick={onRemove}
        disabled={busy}
        // Tombol hapus menyebut nama produknya: "hapus" saja tidak cukup
        // untuk pembaca layar pada daftar berisi banyak baris.
        aria-label={`Hapus ${name} dari keranjang`}
      >
        🗑
      </button>
    </div>
  );
}

export function ConfirmRemove({
  item,
  onCancel,
  onConfirm,
  busy,
}: {
  item: CartItem;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Konfirmasi hapus produk"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.35)',
        display: 'grid',
        placeItems: 'end center',
      }}
      onClick={onCancel}
    >
      <div
        className="kc-card kc-card--pad stack-md"
        style={{
          width: 'min(520px, 100%)',
          margin: 'var(--sp-base)',
          borderRadius: 'var(--r-modal)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          Hapus produk ini?
        </p>
        <p className="t-caption">
          {itemName(item)} akan dikeluarkan dari keranjang. Produk lain tidak
          terpengaruh.
        </p>
        <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
          <Button variant="secondary" block onClick={onCancel}>
            Batal
          </Button>
          <Button block disabled={busy} onClick={onConfirm}>
            {busy ? 'Menghapus…' : 'Hapus'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { itemName, itemStock, lineTotal };

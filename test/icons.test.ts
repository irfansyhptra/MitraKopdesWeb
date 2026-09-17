import { describe, expect, it } from 'vitest';
import { categoryIcon, tintAt, TILE_TINTS } from '@shared/design/icons';
import { Carrot, ShoppingBag, Wheat } from 'lucide-react';

/**
 * Nama kategori datang dari backend dan bisa berubah kapan saja, jadi
 * pencocokannya longgar. Yang dijaga di sini: ia selalu mengembalikan ikon,
 * tidak pernah `undefined` — tile tanpa ikon hanya tampil sebagai kotak warna
 * tanpa petunjuk apa pun.
 */

describe('categoryIcon', () => {
  it('mengenali kategori yang sudah dipetakan', () => {
    expect(categoryIcon('Sembako')).toBe(Wheat);
    expect(categoryIcon('beras & bahan pokok')).toBe(Wheat);
    expect(categoryIcon('Sayur Segar')).toBe(Carrot);
  });

  it('tidak peduli huruf besar-kecil', () => {
    expect(categoryIcon('SEMBAKO')).toBe(Wheat);
  });

  it('kategori yang belum dipetakan tetap dapat ikon', () => {
    expect(categoryIcon('Peralatan Bengkel')).toBe(ShoppingBag);
    expect(categoryIcon('')).toBe(ShoppingBag);
  });
});

describe('tintAt', () => {
  it('berputar mengelilingi palet, tidak pernah kehabisan warna', () => {
    expect(tintAt(0)).toBe(TILE_TINTS[0]);
    expect(tintAt(TILE_TINTS.length)).toBe(TILE_TINTS[0]);
    expect(tintAt(99)).toBe(TILE_TINTS[99 % TILE_TINTS.length]);
  });
});

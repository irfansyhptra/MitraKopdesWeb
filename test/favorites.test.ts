import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isFavorite,
  subscribeFavorites,
  toggleFavorite,
} from '../app/lib/favorites';

/**
 * Favorit tersimpan di peramban, jadi yang dijaga di sini adalah dua keadaan
 * yang mudah terlewat: penyimpanan yang melempar (mode privat) dan isi yang
 * rusak. Keduanya tidak boleh menjatuhkan halaman.
 */

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('favorit', () => {
  it('menyimpan lalu membaca kembali', () => {
    expect(isFavorite('p1')).toBe(false);
    expect(toggleFavorite('p1')).toBe(true);
    expect(isFavorite('p1')).toBe(true);
    expect(toggleFavorite('p1')).toBe(false);
    expect(isFavorite('p1')).toBe(false);
  });

  it('memberi tahu pelanggan saat berubah', () => {
    const listener = vi.fn();
    const stop = subscribeFavorites(listener);
    toggleFavorite('p1');
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    toggleFavorite('p2');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('isi yang rusak dianggap kosong, bukan melempar', () => {
    window.localStorage.setItem('kopdes.favorites', '{bukan json');
    expect(isFavorite('p1')).toBe(false);
  });

  it('nilai bukan string diabaikan', () => {
    window.localStorage.setItem('kopdes.favorites', '["p1", 42, null]');
    expect(isFavorite('p1')).toBe(true);
  });

  it('penyimpanan yang melempar tidak menggagalkan interaksinya', () => {
    // Mode privat menolak setItem; hatinya tetap boleh ditekan.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => toggleFavorite('p1')).not.toThrow();
  });
});

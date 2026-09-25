import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createApiClient } from '@shared/api';
import { MetaLine, directionsUrl } from '../app/components/KopdesCard';
// `ratingLabel` pindah ke formatter bersama supaya kartu produk, kartu
// Kopdes, dan daftar mitra memakai format yang sama.
import { ratingLabel } from '@shared/format';

/**
 * Baris meta Kopdes dan pemetaan endpoint `/koperasi`.
 *
 * Dua hal yang mudah rusak diam-diam: pemisah "•" yang menggantung ketika
 * salah satu bagian tidak ada, dan nama larik hasil dari backend
 * (`koperasi`, bukan `items`).
 */

function withFetch(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

const client = () => createApiClient({ baseUrl: 'https://contoh.test/api/v1' });
const noRating = { average: null, count: 0 };

describe('baris meta', () => {
  it('tidak meninggalkan pemisah menggantung saat hanya satu bagian ada', () => {
    const { container } = render(
      <MetaLine rating={noRating} distanceLabel="850 m" />,
    );
    expect(container.textContent).toBe('850 m');
  });

  it('merangkai rating, jarak, dan status dengan satu pemisah di antaranya', () => {
    const { container } = render(
      <MetaLine
        rating={{ average: 4.8, count: 12 }}
        distanceLabel="850 m"
        isOpen
      />,
    );
    expect(container.textContent).toBe('4,8•850 m•Buka');
  });

  it('membedakan "belum dinilai" dari nol bintang', () => {
    render(<MetaLine rating={noRating} />);
    expect(screen.getByText('Belum ada ulasan')).toBeTruthy();
  });

  it('menampilkan Tutup, bukan hanya warna, saat sedang tutup', () => {
    const { container } = render(<MetaLine rating={noRating} isOpen={false} />);
    expect(container.textContent).toBe('Tutup');
  });
});

describe('rating', () => {
  it('memakai koma sebagai pemisah desimal', () => {
    expect(ratingLabel({ average: 4.75, count: 3 })).toBe('4,8');
  });

  it('kosong bila belum ada yang menilai', () => {
    expect(ratingLabel(noRating)).toBeNull();
    // count 0 dengan average terisi tetap dianggap belum ada ulasan.
    expect(ratingLabel({ average: 5, count: 0 })).toBeNull();
  });
});

describe('petunjuk arah', () => {
  it('menunjuk koordinat koperasi, bukan namanya', () => {
    expect(directionsUrl({ latitude: 5.5, longitude: 95.3 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=5.5,95.3',
    );
  });
});

describe('daftar Kopdes', () => {
  it('membaca larik `koperasi` dari envelope, bukan `items`', async () => {
    withFetch({
      success: true,
      data: {
        koperasi: [{ id: 'k1', name: 'Kopdes Lamteh' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    });
    const page = await client().getKoperasiList();
    expect(page.items.map((k) => k.name)).toEqual(['Kopdes Lamteh']);
    expect(page.meta.totalPages).toBe(1);
  });

  it('tidak meledak ketika larik hasilnya hilang', async () => {
    withFetch({ success: true, data: {} });
    const page = await client().getKoperasiList();
    expect(page.items).toEqual([]);
  });

  it('mengirim koordinat dan radius ke endpoint terdekat', async () => {
    withFetch({ success: true, data: { koperasi: [] } });
    await client().getNearbyKoperasi(
      { latitude: 5.5, longitude: 95.3, radiusKm: 25, openNow: true },
      1,
      6,
    );
    const url = (globalThis.fetch as unknown as { mock: { calls: string[][] } })
      .mock.calls[0][0];
    expect(url).toContain('/koperasi/nearby?');
    expect(url).toContain('latitude=5.5');
    expect(url).toContain('radius=25');
    expect(url).toContain('openNow=true');
  });
});

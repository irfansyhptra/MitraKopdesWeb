import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Formulir Buat Koperasi Langsung.
 *
 * Yang dijaga: bentuk permintaannya. Mengirim `initialPassword: ""` saat
 * kata sandi dibuatkan sistem akan ditolak validasi panjang minimum di
 * server, dan pesannya ("minimal 8 karakter") tidak akan masuk akal bagi
 * pengurus yang tidak pernah mengetik kata sandi apa pun.
 */

const create = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: { createKopdesDirect: create } }));

const { CreateKopdesDialog } = await import('@/components/super/CreateKopdesDialog');

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  const text: [string, string][] = [
    ['Nama koperasi', 'Kopdes Uji'],
    ['Alamat', 'Jl. Uji 1'],
    ['Desa', 'Ujung'],
    ['Kecamatan', 'Kuta'],
    ['Kabupaten/Kota', 'Banda Aceh'],
    ['Provinsi', 'Aceh'],
    ['Latitude', '5.55'],
    ['Longitude', '95.32'],
    ['Nama pengurus', 'Pak Uji'],
    ['Email pengurus — dipakai untuk masuk', 'uji@kopdes.co'],
    ['Nomor WhatsApp', '081200000001'],
  ];
  for (const [label, value] of text) {
    await user.type(screen.getByLabelText(label), value);
  }
}

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue({
    kopdes: { id: 'k1', name: 'Kopdes Uji' },
    admin: { id: 'u1', email: 'uji@kopdes.co', name: 'Pak Uji' },
    initialPassword: 'AbCdEfGhJkMn',
  });
});

describe('form buat koperasi langsung', () => {
  it('tidak mengirim initialPassword saat dibuatkan sistem', async () => {
    const user = userEvent.setup();
    render(<CreateKopdesDialog onClose={() => {}} onCreated={() => {}} />);
    await fillRequired(user);
    await user.click(screen.getByRole('button', { name: 'Buat Koperasi & Akun' }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).not.toHaveProperty('initialPassword');
  });

  it('mengirim kata sandi yang diketik sendiri', async () => {
    const user = userEvent.setup();
    render(<CreateKopdesDialog onClose={() => {}} onCreated={() => {}} />);
    await fillRequired(user);
    await user.click(screen.getByLabelText(/Tentukan sendiri/));
    await user.type(screen.getByLabelText('Kata sandi'), 'rahasiaku123');
    await user.click(screen.getByRole('button', { name: 'Buat Koperasi & Akun' }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0].initialPassword).toBe('rahasiaku123');
  });

  it('kata sandi terlalu pendek menahan tombol simpan', async () => {
    const user = userEvent.setup();
    render(<CreateKopdesDialog onClose={() => {}} onCreated={() => {}} />);
    await fillRequired(user);
    await user.click(screen.getByLabelText(/Tentukan sendiri/));
    await user.type(screen.getByLabelText('Kata sandi'), 'pendek');

    expect(screen.getByRole('button', { name: 'Buat Koperasi & Akun' })).toBeDisabled();
    expect(screen.getByText(/Kurang 2 lagi/)).toBeInTheDocument();
  });

  it('kata sandi bisa dilihat agar salah ketik ketahuan', async () => {
    const user = userEvent.setup();
    render(<CreateKopdesDialog onClose={() => {}} onCreated={() => {}} />);
    await user.click(screen.getByLabelText(/Tentukan sendiri/));

    const field = screen.getByLabelText('Kata sandi');
    expect(field).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Lihat' }));
    expect(field).toHaveAttribute('type', 'text');
  });

  it('koordinat di luar rentang menahan tombol simpan', async () => {
    const user = userEvent.setup();
    render(<CreateKopdesDialog onClose={() => {}} onCreated={() => {}} />);
    await fillRequired(user);
    await user.clear(screen.getByLabelText('Latitude'));
    // 95 sebagai latitude adalah kekeliruan yang mudah terjadi: tertukar
    // dengan longitude Aceh.
    await user.type(screen.getByLabelText('Latitude'), '95.32');

    expect(screen.getByRole('button', { name: 'Buat Koperasi & Akun' })).toBeDisabled();
  });
});

/**
 * Aturan kata sandi hidup di satu komponen bersama, jadi ia diuji sekali
 * sebagai unit — bukan diulang untuk tiap formulir yang memakainya.
 */
describe('aturan kata sandi bersama', () => {
  it('mode otomatis tidak menghasilkan field apa pun', async () => {
    const { passwordPayload } = await import('@/components/super/PasswordChoice');
    expect(passwordPayload(false, '')).toEqual({});
    // Bahkan bila kolomnya sempat terisi lalu pengguna berpindah ke otomatis.
    expect(passwordPayload(false, 'terlanjurdiketik')).toEqual({});
  });

  it('mode manual mengirim apa adanya', async () => {
    const { passwordPayload } = await import('@/components/super/PasswordChoice');
    expect(passwordPayload(true, 'rahasiaku123')).toEqual({
      initialPassword: 'rahasiaku123',
    });
  });

  it('panjang minimum hanya berlaku pada mode manual', async () => {
    const { isPasswordValid } = await import('@/components/super/PasswordChoice');
    expect(isPasswordValid(false, '')).toBe(true);
    expect(isPasswordValid(true, 'pendek')).toBe(false);
    expect(isPasswordValid(true, 'delapan8')).toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Panel Akun Pegawai.
 *
 * Yang dijaga di sini bukan tampilannya melainkan bentuk permintaan yang
 * dikirim: "pegawai penuh" harus mengirim daftar KOSONG, bukan seluruh izin.
 * Keduanya berperilaku sama hari ini, tetapi akun yang menyimpan seluruh
 * daftar sebagai override berhenti ikut ketika bawaan peran berubah — dan
 * itu baru ketahuan berbulan-bulan kemudian.
 */

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  list: vi.fn(),
  catalog: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/components/staff/StaffContext', () => ({
  useStaff: () => ({ can: mocks.can }),
}));
vi.mock('@/lib/api', () => ({
  api: {
    getStaffAccounts: mocks.list,
    getPermissionCatalog: mocks.catalog,
    createPegawai: mocks.create,
    updatePegawai: mocks.update,
    deletePegawai: mocks.remove,
  },
}));

const { default: AccountsPage } = await import('@/app/pegawai/akun/page');

const CATALOG = {
  assignable: ['order:read', 'order:process', 'inventory:read'],
  items: [
    { key: 'order:read', label: 'Lihat pesanan', group: 'Pesanan', description: 'a' },
    { key: 'order:process', label: 'Proses pesanan', group: 'Pesanan', description: 'b' },
    { key: 'inventory:read', label: 'Lihat stok', group: 'Stok', description: 'c' },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.can.mockReturnValue(true);
  mocks.catalog.mockResolvedValue(CATALOG);
  mocks.list.mockResolvedValue([]);
  mocks.create.mockResolvedValue({ id: 'p1' });
  mocks.update.mockResolvedValue({ id: 'p1' });
});

describe('panel akun koperasi', () => {
  it('tidak memanggil endpoint apa pun tanpa wewenang', async () => {
    mocks.can.mockReturnValue(false);
    render(<AccountsPage />);
    expect(screen.getByText('Akses terbatas')).toBeInTheDocument();
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.catalog).not.toHaveBeenCalled();
  });

  it('"pegawai penuh" mengirim daftar kosong, bukan seluruh izin', async () => {
    const user = userEvent.setup();
    render(<AccountsPage />);
    await user.click(await screen.findByRole('button', { name: /Tambah Akun/ }));

    await user.type(screen.getByLabelText('Nama'), 'Andi');
    await user.type(screen.getByLabelText('Email'), 'andi@kopdes.co');
    await user.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await user.click(screen.getByRole('button', { name: 'Buat Akun' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(mocks.create.mock.calls[0][0].permissions).toEqual([]);
  });

  it('mode "pilih sendiri" mengirim hanya yang dicentang', async () => {
    const user = userEvent.setup();
    render(<AccountsPage />);
    await user.click(await screen.findByRole('button', { name: /Tambah Akun/ }));

    await user.type(screen.getByLabelText('Nama'), 'Dewi');
    await user.type(screen.getByLabelText('Email'), 'dewi@kopdes.co');
    await user.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await user.click(screen.getByLabelText(/Pegawai · pilih sendiri/));

    // Semula semua tercentang; lepas dua, sisakan satu.
    await user.click(screen.getByRole('checkbox', { name: /Proses pesanan/ }));
    await user.click(screen.getByRole('checkbox', { name: /Lihat stok/ }));
    await user.click(screen.getByRole('button', { name: 'Buat Akun' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    expect(mocks.create.mock.calls[0][0].permissions).toEqual(['order:read']);
  });

  it('menolak menyimpan akun tanpa satu pun wewenang', async () => {
    const user = userEvent.setup();
    render(<AccountsPage />);
    await user.click(await screen.findByRole('button', { name: /Tambah Akun/ }));

    await user.type(screen.getByLabelText('Nama'), 'Kosong');
    await user.type(screen.getByLabelText('Email'), 'kosong@kopdes.co');
    await user.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
    await user.click(screen.getByLabelText(/Pegawai · pilih sendiri/));
    for (const label of [/Lihat pesanan/, /Proses pesanan/, /Lihat stok/]) {
      await user.click(screen.getByRole('checkbox', { name: label }));
    }

    expect(screen.getByRole('button', { name: 'Buat Akun' })).toBeDisabled();
    expect(screen.getByText(/setidaknya satu wewenang/)).toBeInTheDocument();
  });

  it('kata sandi kosong saat menyunting tidak ikut dikirim', async () => {
    mocks.list.mockResolvedValue([
      {
        id: 'p1', email: 'a@b.co', name: 'Andi', phone: null, role: 'PEGAWAI_KOPDES',
        kopdesId: 'k1', permissions: [], effectivePermissions: CATALOG.assignable,
        usesRoleDefaults: true, createdAt: '2026-01-01',
      },
    ]);
    const user = userEvent.setup();
    render(<AccountsPage />);
    await user.click(await screen.findByRole('button', { name: 'Atur Akses' }));
    await user.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(mocks.update.mock.calls[0][1]).not.toHaveProperty('password');
  });

  it('penghapusan akun lewat konfirmasi, bukan sekali tekan', async () => {
    mocks.list.mockResolvedValue([
      {
        id: 'p1', email: 'a@b.co', name: 'Andi', phone: null, role: 'PEGAWAI_KOPDES',
        kopdesId: 'k1', permissions: [], effectivePermissions: [],
        usesRoleDefaults: true, createdAt: '2026-01-01',
      },
    ]);
    const user = userEvent.setup();
    render(<AccountsPage />);
    await user.click(await screen.findByRole('button', { name: 'Hapus akun Andi' }));

    expect(mocks.remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Ya, hapus' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('p1'));
  });
});

describe('kurir', () => {
  async function openDialog(user: ReturnType<typeof userEvent.setup>) {
    render(<AccountsPage />);
    await user.click(await screen.findByRole('button', { name: /Tambah Akun/ }));
    await user.type(screen.getByLabelText('Nama'), 'Pak Kurir');
    await user.type(screen.getByLabelText('Email'), 'kurir@kopdes.co');
    await user.type(screen.getByLabelText('Kata sandi'), 'rahasia123');
  }

  it('mengirim role COURIER dan tanpa daftar wewenang', async () => {
    const user = userEvent.setup();
    await openDialog(user);
    await user.click(screen.getByLabelText(/Kurir/));
    await user.click(screen.getByRole('button', { name: 'Buat Akun' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalled());
    const sent = mocks.create.mock.calls[0][0];
    expect(sent.role).toBe('COURIER');
    // Wewenang tidak berlaku bagi kurir; mengirimnya menyesatkan pembaca
    // barisnya nanti meski backend mengabaikannya.
    expect(sent).not.toHaveProperty('permissions');
  });

  it('daftar centang wewenang tidak muncul untuk kurir', async () => {
    const user = userEvent.setup();
    await openDialog(user);
    await user.click(screen.getByLabelText(/Kurir/));

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText(/tidak membuka portal pegawai/)).toBeInTheDocument();
  });

  it('jenis akun terkunci saat menyunting', async () => {
    mocks.list.mockResolvedValue([
      {
        id: 'k1', email: 'k@b.co', name: 'Kurir Lama', phone: null, role: 'COURIER',
        kopdesId: 'k1', permissions: [], effectivePermissions: [],
        usesRoleDefaults: true, createdAt: '2026-01-01',
      },
    ]);
    const user = userEvent.setup();
    render(<AccountsPage />);
    await user.click(await screen.findByRole('button', { name: 'Ubah Akun' }));

    // Memindahkan kurir menjadi pegawai akan memberinya akses portal
    // diam-diam; sebaliknya mencabut wewenang pegawai tanpa jejak.
    // Label memuat judul + keterangannya, jadi radionya diambil berurutan:
    // penuh, pilih sendiri, kurir.
    const [penuh, pilih, kurir] = screen.getAllByRole('radio');
    expect(penuh).toBeDisabled();
    expect(pilih).toBeDisabled();
    expect(kurir).toBeChecked();
  });

  it('kurir ditandai di daftar akun', async () => {
    mocks.list.mockResolvedValue([
      {
        id: 'k1', email: 'k@b.co', name: 'Kurir Lama', phone: null, role: 'COURIER',
        kopdesId: 'k1', permissions: [], effectivePermissions: [],
        usesRoleDefaults: true, createdAt: '2026-01-01',
      },
    ]);
    render(<AccountsPage />);
    expect(await screen.findByText('Kurir koperasi')).toBeInTheDocument();
  });
});

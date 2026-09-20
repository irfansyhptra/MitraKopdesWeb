import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  can: vi.fn(), finance: vi.fn(), deliveries: vi.fn(), couriers: vi.fn(), assign: vi.fn(), unassign: vi.fn(), ai: vi.fn(),
}));
vi.mock('@/components/staff/StaffContext', () => ({ useStaff: () => ({ can: mocks.can }) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/api', () => ({ api: {
  getStaffFinance: mocks.finance, getDeliveries: mocks.deliveries, getCouriers: mocks.couriers,
  assignCourier: mocks.assign, unassignCourier: mocks.unassign, aiManagement: mocks.ai,
} }));

import FinancePage from '@/app/pegawai/keuangan/page';
import StaffAiPage from '@/app/pegawai/ai/page';
import { DeliveryManagement } from '@/components/staff/DeliveryManagement';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.can.mockReturnValue(true);
  mocks.finance.mockResolvedValue({ grossSales: '150000', transactionCount: 2, qrisTotal: '100000', codTotal: '50000', refundTotal: '0', changePercent: null });
  mocks.deliveries.mockResolvedValue([{ id: 'd1', status: 'ASSIGNED', courier: null, order: { id: 'o1', customer: { name: 'Rina' } } }]);
  mocks.couriers.mockResolvedValue([{ id: 'c1', name: 'Budi', activeCount: 2 }]);
});

describe('portal pegawai', () => {
  it('does not fetch finance data without permission', async () => {
    mocks.can.mockReturnValue(false);
    render(<FinancePage />);
    expect(screen.getByText('Akses terbatas')).toBeInTheDocument();
    expect(mocks.finance).not.toHaveBeenCalled();
  });

  it('switches report periods without inventing missing monetary components', async () => {
    const user = userEvent.setup();
    render(<FinancePage />);
    expect(await screen.findByText('Rp150.000')).toBeInTheDocument();
    expect(screen.queryByText('Diskon')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bulanan' }));
    await waitFor(() => expect(mocks.finance).toHaveBeenLastCalledWith('month'));
  });

  it('keeps deliveries locked once the courier has picked up the goods', async () => {
    mocks.deliveries.mockResolvedValue([{ id: 'd1', status: 'PICKED_UP', courier: { id: 'c1', name: 'Budi' }, order: { id: 'o1' } }]);
    render(<DeliveryManagement />);
    expect(await screen.findByText('Barang Diambil')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ganti Kurir' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lepas Kurir' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lacak Pesanan' })).toHaveAttribute('href', '/pegawai/lacak?deliveryId=d1');
  });

  it('restores a failed AI question so staff can retry it', async () => {
    mocks.ai.mockRejectedValue(new Error('Layanan sedang sibuk'));
    const user = userEvent.setup();
    render(<StaffAiPage />);
    await user.type(screen.getByLabelText('Tulis pesan'), 'Periksa stok');
    await user.click(screen.getByRole('button', { name: 'Kirim pesan' }));
    expect(await screen.findByText('Layanan sedang sibuk')).toBeInTheDocument();
    expect(screen.getByLabelText('Tulis pesan')).toHaveValue('Periksa stok');
    expect(screen.getByRole('button', { name: 'Kirim pesan' })).toBeEnabled();
  });
});

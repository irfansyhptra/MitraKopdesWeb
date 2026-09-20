import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createApiClient } from '@shared/api';
import { Countdown, CopyRow, STATUS_VIEW } from '@/components/payment/PaymentBits';
import { PAYMENT_METHODS, methodInfo } from '@/components/payment/methods';
import { isFinalStatus } from '@/components/payment/usePaymentStatus';
import type { PaymentView } from '@shared/api';

vi.mock('@/lib/api', () => ({ api: {} }));

/**
 * Sisi klien pembayaran.
 *
 * Yang diuji: bentuk permintaan ke backend, hitung mundur yang memakai waktu
 * server, dan kapan polling berhenti. Aturan uangnya sendiri diuji di
 * backend — di sana ia ditegakkan.
 */

describe('klien API pembayaran', () => {
  function withFetch(body: unknown, status = 200) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  }

  afterEach(() => vi.unstubAllGlobals());

  const client = () => createApiClient({ baseUrl: 'https://contoh.test/api/v1' });
  const OK = { success: true, data: { orderId: 'o1', status: 'PENDING' } };

  it('hanya mengirim id pesanan dan metode — tidak ada nominal', async () => {
    const fetchMock = withFetch(OK);
    await client().createPayment('order-1', 'QRIS');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://contoh.test/api/v1/payments/create');
    const sent = JSON.parse(init.body);
    // Nominal yang dikirim klien adalah nominal yang bisa diubah siapa pun
    // lewat DevTools; backend menghitungnya ulang dari database.
    expect(sent).toEqual({ orderId: 'order-1', paymentMethod: 'QRIS' });
    for (const forbidden of ['amount', 'grossAmount', 'total', 'discount']) {
      expect(sent).not.toHaveProperty(forbidden);
    }
  });

  it('cek status memakai POST ke endpoint pesanannya', async () => {
    const fetchMock = withFetch(OK);
    await client().checkPaymentStatus('order-1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://contoh.test/api/v1/payments/order-1/check-status');
    expect(init.method).toBe('POST');
  });

  it('id pesanan di-encode, bukan ditempel apa adanya', async () => {
    const fetchMock = withFetch(OK);
    await client().getPayment('a/b?c');
    expect(String(fetchMock.mock.calls[0][0])).toContain('a%2Fb%3Fc');
  });
});

describe('katalog metode', () => {
  it('tidak menawarkan kartu kredit', () => {
    // Input kartu langsung menuntut kepatuhan PCI DSS tersendiri.
    expect(PAYMENT_METHODS.some((m) => /kartu|card/i.test(m.name))).toBe(false);
  });

  it('tiap metode punya halaman instruksinya', () => {
    for (const m of PAYMENT_METHODS) {
      expect(['qris', 'va', 'ewallet', 'bill']).toContain(m.instruction);
    }
  });

  it('kode metode tidak ada yang kembar', () => {
    const codes = PAYMENT_METHODS.map((m) => m.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('metode tak dikenal dijawab undefined, bukan melempar', () => {
    expect(methodInfo('KARTU_KREDIT')).toBeUndefined();
  });
});

describe('pemetaan status di klien', () => {
  it('tiap status punya judul dan keterangannya', () => {
    const all: PaymentView[] = [
      'PENDING', 'PAID', 'DENIED', 'CANCELLED', 'EXPIRED', 'FAILED', 'REFUNDED',
    ];
    for (const s of all) {
      expect(STATUS_VIEW[s].label.length).toBeGreaterThan(0);
      expect(STATUS_VIEW[s].description.length).toBeGreaterThan(0);
    }
  });

  it('hanya menunggu yang berdenyut', () => {
    expect(STATUS_VIEW.PENDING.waiting).toBe(true);
    expect(STATUS_VIEW.PAID.waiting).toBe(false);
  });

  it('polling berhenti pada semua status akhir', () => {
    expect(isFinalStatus('PENDING')).toBe(false);
    for (const s of ['PAID', 'DENIED', 'CANCELLED', 'EXPIRED', 'FAILED', 'REFUNDED'] as const) {
      expect(isFinalStatus(s)).toBe(true);
    }
  });
});

describe('hitung mundur', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('memakai expiryTime dari server, bukan durasi tebakan', () => {
    const in5min = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    render(<Countdown expiryTime={in5min} />);
    expect(screen.getByText(/04:5\d tersisa|05:00 tersisa/)).toBeInTheDocument();
  });

  it('tanpa expiryTime tidak menggambar apa pun', () => {
    const { container } = render(<Countdown expiryTime={null} />);
    // Hitung mundur karangan klien lebih buruk daripada tidak ada: ia bisa
    // berakhir lebih cepat daripada kenyataan dan menghentikan pembayaran.
    expect(container).toBeEmptyDOMElement();
  });

  it('waktu yang sudah lewat langsung ditulis habis', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    render(<Countdown expiryTime={past} />);
    expect(screen.getByText(/Waktu pembayaran habis/)).toBeInTheDocument();
  });

  it('memanggil onExpire saat mencapai nol', async () => {
    const onExpire = vi.fn();
    render(<Countdown expiryTime={new Date(Date.now() + 1200).toISOString()} onExpire={onExpire} />);
    await vi.advanceTimersByTimeAsync(2500);
    expect(onExpire).toHaveBeenCalled();
  });
});

describe('baris salin', () => {
  it('menyalin nilainya dan memberi umpan balik', async () => {
    // Spy dipasang SETELAH setup: user-event memasang stub clipboard-nya
    // sendiri saat setup, dan stub yang dipasang lebih dulu akan tertimpa.
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);

    render(<CopyRow label="NOMOR VA" value="8808123456" />);
    await user.click(screen.getByRole('button', { name: /Salin NOMOR VA/ }));

    expect(writeText).toHaveBeenCalledWith('8808123456');
    await waitFor(() => expect(screen.getByText('Tersalin')).toBeInTheDocument());
    writeText.mockRestore();
  });

  it('clipboard yang ditolak tidak mematahkan halaman', async () => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValue(new Error('ditolak'));

    render(<CopyRow label="NOMOR VA" value="8808123456" />);
    await user.click(screen.getByRole('button', { name: /Salin NOMOR VA/ }));

    // Nilainya tetap terlihat dan bisa disalin manual.
    expect(screen.getByText('8808123456')).toBeInTheDocument();
    expect(screen.queryByText('Tersalin')).not.toBeInTheDocument();
    writeText.mockRestore();
  });
});

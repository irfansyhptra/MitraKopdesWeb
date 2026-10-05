import { afterEach, describe, expect, it, vi } from 'vitest';
import { openSnapPayment } from '../app/components/payment/snap';
import type { PaymentSnapshot } from '../shared/types';

const payment: PaymentSnapshot = {
  orderId: 'order-1',
  method: 'MIDTRANS',
  status: 'PENDING',
  midtransOrderId: 'KOMIT-order-1',
  transactionId: null,
  paymentType: null,
  transactionStatus: 'pending',
  fraudStatus: null,
  grossAmount: 50000,
  expiryTime: null,
  vaNumber: null,
  bank: null,
  billKey: null,
  billerCode: null,
  qrCodeUrl: null,
  deeplinkUrl: null,
  actions: [],
  paidAt: null,
  snapToken: 'snap-token',
  snapRedirectUrl: 'https://app.sandbox.midtrans.com/snap/v3/redirection/x',
  snapClientKey: 'SB-Mid-client-public',
  snapScriptUrl: 'https://app.sandbox.midtrans.com/snap/snap.js',
  snapEnvironment: 'sandbox',
};

afterEach(() => {
  delete window.snap;
  document.querySelectorAll('script[data-komit-midtrans-snap]').forEach((node) =>
    node.remove(),
  );
});

describe('Midtrans Snap popup', () => {
  it('menolak skrip di luar sandbox', async () => {
    await expect(
      openSnapPayment({
        ...payment,
        snapScriptUrl: 'https://app.midtrans.com/snap/snap.js',
      }),
    ).rejects.toThrow(/Sandbox/i);
  });

  it('memuat Snap.js sandbox dan membuka token di popup', async () => {
    const pay = vi.fn();
    const opening = openSnapPayment(payment);
    const script = document.querySelector<HTMLScriptElement>(
      'script[data-komit-midtrans-snap]',
    );

    expect(script?.src).toBe(payment.snapScriptUrl);
    expect(script?.dataset.clientKey).toBe(payment.snapClientKey);

    window.snap = { pay };
    script?.dispatchEvent(new Event('load'));
    await opening;

    expect(pay).toHaveBeenCalledWith(
      'snap-token',
      expect.objectContaining({ language: 'id', uiMode: 'auto' }),
    );
  });
});

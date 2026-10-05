import type { PaymentSnapshot } from '@shared/api';

type SnapResult = Record<string, unknown>;

type SnapCallbacks = {
  onSuccess?: (result: SnapResult) => void;
  onPending?: (result: SnapResult) => void;
  onError?: (result: SnapResult) => void;
  onClose?: () => void;
};

type SnapClient = {
  pay: (
    token: string,
    options: SnapCallbacks & {
      language: 'id';
      uiMode: 'auto';
    },
  ) => void;
};

declare global {
  interface Window {
    snap?: SnapClient;
  }
}

const SANDBOX_SCRIPT = 'https://app.sandbox.midtrans.com/snap/snap.js';
let loading: Promise<SnapClient> | null = null;

/** Memuat Snap.js Sandbox satu kali dan menolak URL selain sandbox. */
function loadSnap(clientKey: string, scriptUrl: string): Promise<SnapClient> {
  if (scriptUrl !== SANDBOX_SCRIPT) {
    return Promise.reject(
      new Error('Pembayaran hanya diizinkan melalui Midtrans Sandbox.'),
    );
  }
  if (window.snap) return Promise.resolve(window.snap);
  if (loading) return loading;

  loading = new Promise<SnapClient>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-komit-midtrans-snap]',
    );
    const script = existing ?? document.createElement('script');

    const complete = () => {
      if (window.snap) resolve(window.snap);
      else reject(new Error('Midtrans Snap tidak berhasil dimuat.'));
    };

    script.addEventListener('load', complete, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Midtrans Snap tidak dapat dijangkau.')),
      { once: true },
    );

    if (!existing) {
      script.src = SANDBOX_SCRIPT;
      script.async = true;
      script.dataset.clientKey = clientKey;
      script.dataset.komitMidtransSnap = 'true';
      document.head.appendChild(script);
    }
  }).catch((error) => {
    loading = null;
    throw error;
  });

  return loading!;
}

export async function openSnapPayment(
  payment: PaymentSnapshot,
  callbacks: SnapCallbacks = {},
) {
  if (
    payment.snapEnvironment !== 'sandbox' ||
    !payment.snapToken ||
    !payment.snapClientKey
  ) {
    throw new Error('Sesi pembayaran Snap Sandbox belum tersedia.');
  }

  const snap = await loadSnap(payment.snapClientKey, payment.snapScriptUrl);
  snap.pay(payment.snapToken, {
    language: 'id',
    uiMode: 'auto',
    ...callbacks,
  });
}

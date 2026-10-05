'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { setTokens } from '@/lib/auth';
import { Button, Card, Message } from '@shared/design/ui';
import { Mail, ShieldCheck } from '@shared/design/icons';

const EMAIL_KEY = 'kopdes_pending_email';

export default function VerifyEmailPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(EMAIL_KEY) ?? '';
    const storedResendAt = window.sessionStorage.getItem('kopdes_otp_resend_at');
    const resendAt = Number(storedResendAt);
    const remaining = storedResendAt && Number.isFinite(resendAt)
      ? Math.max(0, Math.ceil((resendAt - Date.now()) / 1000))
      : 60;
    setEmail(stored);
    setSeconds(remaining);
    setReady(true);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (code.length !== 6) { setError('Masukkan 6 angka kode verifikasi.'); return; }
    setSubmitting(true); setError(null); setNotice(null);
    try {
      const result = await api.verifyCustomerEmail(email, code);
      setTokens(result.accessToken, result.refreshToken);
      window.sessionStorage.removeItem(EMAIL_KEY);
      window.sessionStorage.removeItem('kopdes_otp_resend_at');
      router.replace('/');
    } catch (reason) { setError((reason as Error).message); setSubmitting(false); }
  }

  async function resend() {
    setResending(true); setError(null); setNotice(null);
    try {
      const challenge = await api.resendCustomerEmailOtp(email);
      setSeconds(challenge.resendAfter);
      window.sessionStorage.setItem(
        'kopdes_otp_resend_at',
        String(Date.now() + challenge.resendAfter * 1000),
      );
      setCode('');
      setNotice('Kode baru sudah dikirim ke email Anda.');
      inputRef.current?.focus();
    } catch (reason) { setError((reason as Error).message); }
    finally { setResending(false); }
  }

  if (!ready) return null;
  if (!email) return <Message title="Pendaftaran belum ditemukan" body="Isi formulir pendaftaran terlebih dahulu agar kami dapat mengirim kode verifikasi." actionLabel="Buka Pendaftaran" href="/register" />;

  return <div className="auth-wrap">
    <Card className="stack-md otp-card">
      <span className="otp-card__icon" aria-hidden="true"><Mail size={28} /></span>
      <div className="otp-card__heading"><h1 className="page-title">Verifikasi Email</h1><p className="page-sub">Masukkan kode 6 angka yang dikirim ke <strong>{maskEmail(email)}</strong>. Kode berlaku selama 10 menit.</p></div>
      <form className="stack-md" onSubmit={(event) => void verify(event)}>
        <div className="field"><label htmlFor="email-otp">Kode verifikasi</label><input ref={inputRef} id="email-otp" className="otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></div>
        {notice && <p className="form-success" role="status"><ShieldCheck size={15} />{notice}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button type="submit" block disabled={submitting || code.length !== 6}>{submitting ? 'Memverifikasi…' : 'Verifikasi & Masuk'}</Button>
      </form>
      <div className="otp-card__resend"><span>Tidak menerima email?</span><button type="button" disabled={seconds > 0 || resending} onClick={() => void resend()}>{resending ? 'Mengirim…' : seconds > 0 ? `Kirim ulang dalam ${seconds} dtk` : 'Kirim ulang kode'}</button></div>
      <Link
        href="/register"
        className="kc-btn kc-btn--ghost kc-btn--block"
        onClick={() => {
          window.sessionStorage.removeItem(EMAIL_KEY);
          window.sessionStorage.removeItem('kopdes_otp_resend_at');
        }}
      >
        Ganti alamat email
      </Link>
    </Card>
  </div>;
}

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { StaffAccess, StaffPageHeader } from '@/components/staff/StaffPage';
import { Permissions } from '@shared/api';
import { Boxes, ReceiptText, Send, Sparkles, TrendingUp, TriangleAlert } from '@shared/design/icons';

const SUGGESTIONS = [
  { icon: Boxes, title: 'Rekomendasi Restok', text: 'Produk apa yang perlu segera direstok?' },
  { icon: ReceiptText, title: 'Prioritas Pesanan', text: 'Bantu saya menentukan prioritas pesanan hari ini.' },
  { icon: TrendingUp, title: 'Tren Penjualan', text: 'Bagaimana tren penjualan koperasi saat ini?' },
  { icon: TriangleAlert, title: 'Evaluasi Stok', text: 'Bantu saya mengevaluasi kondisi stok koperasi.' },
];
interface Message { role: 'user' | 'ai'; text: string; error?: boolean }

export default function StaffAiPage() {
  return <StaffAccess permission={Permissions.aiAssist}><Assistant /></StaffAccess>;
}

function Assistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = log.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, busy]);

  async function send(text: string) {
    if (!text.trim() || inFlight.current) return;
    inFlight.current = true; setBusy(true); setDraft('');
    setMessages((current) => [...current, { role: 'user', text: text.trim() }]);
    try {
      const answer = await api.aiManagement(text.trim());
      if (!answer.trim()) throw new Error('Asisten belum mengembalikan jawaban. Silakan coba lagi.');
      setMessages((current) => [...current, { role: 'ai', text: answer }]);
    } catch (e) {
      setDraft(text);
      setMessages((current) => [...current, { role: 'ai', text: (e as Error).message, error: true }]);
    } finally { inFlight.current = false; setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void send(draft); }

  return <>
    <StaffPageHeader title="AI Assistant Kopdes" description="Asisten operasional untuk pekerjaan sehari-hari" />
    <section className="staff-surface staff-assistant">
      {!messages.length && <div className="staff-assistant__welcome">
        <span className="staff-assistant__mark"><Sparkles size={36} /></span>
        <span className="staff-chip">Mode Gudang · Pegawai Kopdes</span>
        <h2>Ada yang bisa saya bantu?</h2><p className="staff-muted">Tanyakan stok, penjualan, atau prioritas pekerjaan koperasi.</p>
        <div className="staff-suggestion-grid">{SUGGESTIONS.map((item) => <button key={item.title} type="button" className="staff-suggestion" onClick={() => void send(item.text)} disabled={busy}>
          <item.icon size={22} /><strong>{item.title}</strong><span>{item.text}</span>
        </button>)}</div>
      </div>}
      <div className="staff-chat-log" ref={log} role="log" aria-label="Percakapan asisten" aria-live="polite">
        {messages.map((message, index) => <div className="staff-message" data-role={message.role} data-error={message.error} key={index}>
          <strong>{message.role === 'user' ? 'Anda' : 'AI Assistant Kopdes'}</strong><p>{message.text}</p>
        </div>)}
        {busy && <p className="staff-muted" role="status">Menganalisis pertanyaan…</p>}
      </div>
      <form className="staff-composer" onSubmit={submit}>
        <input aria-label="Tulis pesan" placeholder="Tanyakan tentang operasional koperasi…" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={4000} disabled={busy} />
        <button className="staff-icon-btn" aria-label="Kirim pesan" type="submit" disabled={busy || !draft.trim()}><Send size={20} /></button>
      </form>
    </section>
  </>;
}

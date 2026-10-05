'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { ArrowLeft, Send } from '@shared/design/icons';

export default function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const me = useAsync(() => api.me());
  const messages = useAsync(() => api.getChatMessages(id), [id]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { void api.markConversationRead(id).catch(() => undefined); }, [id]);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight }); }, [messages.data]);
  useEffect(() => { const timer = window.setInterval(messages.reload, 5000); return () => window.clearInterval(timer); }, [messages.reload]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    setBusy(true);
    try { await api.sendChatMessage(id, content); setDraft(''); messages.reload(); }
    catch (error) { window.alert((error as Error).message); }
    finally { setBusy(false); }
  }
  return <div className="chat-detail">
    <header className="chat-detail__head"><Link href="/chat" aria-label="Kembali ke daftar percakapan"><ArrowLeft size={20} /></Link><div><h1>Percakapan</h1><p>Pesan tersambung dengan aplikasi KMP Mitra</p></div></header>
    <div className="chat-detail__log" ref={log} role="log" aria-live="polite">
      {messages.loading && <p className="page-sub">Memuat pesan…</p>}
      {messages.error && <p className="form-error">{messages.error}</p>}
      {messages.data?.map((message) => <div className="chat-bubble" data-mine={message.senderId === me.data?.id ? 'true' : undefined} key={message.id}><strong>{message.senderId === me.data?.id ? 'Anda' : message.sender?.name ?? 'Pengguna'}</strong><p>{message.content}</p><time>{new Date(message.createdAt).toLocaleString('id-ID')}</time></div>)}
    </div>
    <form className="chat-detail__composer" onSubmit={(event) => void submit(event)}><input aria-label="Tulis pesan" maxLength={4000} placeholder="Tulis pesan…" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={busy} /><button className="kc-btn kc-btn--primary" type="submit" disabled={busy || !draft.trim()} aria-label="Kirim pesan"><Send size={18} /></button></form>
  </div>;
}

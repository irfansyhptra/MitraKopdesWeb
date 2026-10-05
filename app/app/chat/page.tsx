'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAsync } from '@/components/staff/useAsync';
import { Message } from '@shared/design/ui';
import type { ChatChannel } from '@shared/api';
import { ReceiptText, Send, Truck, UserIcon } from '@shared/design/icons';

const TABS: Array<{ value: ChatChannel | ''; label: string }> = [
  { value: '', label: 'Semua' },
  { value: 'MARKETPLACE', label: 'Penjual & Pembeli' },
  { value: 'DELIVERY', label: 'Kurir' },
  { value: 'GENERAL', label: 'Umum' },
];

export default function ChatHubPage() {
  const [channel, setChannel] = useState<ChatChannel | ''>('');
  const conversations = useAsync(() => api.getConversations(channel || undefined), [channel]);
  return <div className="chat-page stack-md">
    <header><h1 className="page-title">Percakapan</h1><p className="page-sub">Chat penjual, pembeli, dan kurir menggunakan akun serta endpoint yang sama dengan aplikasi.</p></header>
    <div className="kc-segments" role="group" aria-label="Jenis percakapan">{TABS.map((tab) => <button key={tab.value} aria-pressed={channel === tab.value} onClick={() => setChannel(tab.value)}>{tab.label}</button>)}</div>
    {conversations.loading && <div className="kc-skeleton" style={{ height: 180 }} />}
    {!conversations.loading && conversations.error && <Message title="Percakapan belum berhasil dimuat" body={conversations.error} actionLabel="Coba Lagi" onAction={conversations.reload} />}
    {!conversations.loading && !conversations.error && !conversations.data?.length && <div className="kc-card kc-empty"><Send size={28} /><p>Belum ada percakapan pada bagian ini.</p></div>}
    {!!conversations.data?.length && <div className="kc-group chat-list">{conversations.data.map((conversation) => {
      const Icon = conversation.channel === 'DELIVERY' ? Truck : conversation.channel === 'MARKETPLACE' ? ReceiptText : UserIcon;
      return <Link href={`/chat/${conversation.id}`} className="chat-row" key={conversation.id}><span className="chat-row__avatar"><Icon size={19} /></span><span className="chat-row__body"><strong>{conversation.otherUser.name}</strong><small>{conversation.lastMessage?.content ?? 'Belum ada pesan'}</small></span><span className="chat-row__meta"><time>{new Date(conversation.lastMessageAt).toLocaleDateString('id-ID')}</time>{conversation.unreadCount > 0 && <b>{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</b>}</span></Link>;
    })}</div>}
  </div>;
}

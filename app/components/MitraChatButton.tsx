'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Send } from '@shared/design/icons';

export function MitraChatButton({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function openChat() {
    setBusy(true);
    try {
      const conversation = await api.startConversation(ownerId, 'MARKETPLACE');
      router.push(`/chat/seller/${conversation.id}`);
    } catch {
      router.push('/login');
    } finally { setBusy(false); }
  }
  return <button type="button" className="kc-btn kc-btn--secondary" disabled={busy} onClick={() => void openChat()}><Send size={16} />{busy ? 'Membuka…' : 'Chat Toko'}</button>;
}

import { redirect } from 'next/navigation';

export default async function CourierChatAlias({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; redirect(`/chat/${encodeURIComponent(id)}`); }

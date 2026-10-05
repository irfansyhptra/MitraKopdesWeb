import { redirect } from 'next/navigation';

export default async function KoperasiDetailAliasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/kopdes/${encodeURIComponent(id)}`);
}

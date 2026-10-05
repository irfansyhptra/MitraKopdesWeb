import { redirect } from 'next/navigation';

export default async function MitraProductAliasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/umkm-product/${encodeURIComponent(id)}`);
}

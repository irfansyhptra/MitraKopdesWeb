import { redirect } from 'next/navigation';
export default async function AdminEditProductAliasPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; redirect(`/pegawai/barang/${encodeURIComponent(id)}`); }

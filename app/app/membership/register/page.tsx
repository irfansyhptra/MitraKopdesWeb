import Link from 'next/link';
import { publicApi } from '@/lib/api';
import { Card, LinkButton, SectionHeader } from '@shared/design/ui';

export const dynamic = 'force-dynamic';

export default async function MembershipRegisterPage() {
  const koperasi = await publicApi.getKoperasiList('', 1, 1).catch(() => null);
  const first = koperasi?.items[0];
  return <div className="auth-wrap stack-md">
    <Card className="stack-md">
      <SectionHeader title="Pendaftaran Anggota" />
      <strong>Pendaftaran online tersedia melalui halaman detail Kopdes.</strong>
      <p className="t-caption">Pilih koperasi Anda, baca ketentuan resmi, lalu isi data keanggotaan pada kartu “Keanggotaan Kopdes”.</p>
      {first?.phone && <LinkButton href={`tel:${first.phone}`} block>Hubungi {first.phone}</LinkButton>}
      <Link className="kc-btn kc-btn--secondary kc-btn--block" href="/kopdes">Pilih Kopdes</Link>
      <Link className="kc-btn kc-btn--ghost kc-btn--block" href="/info/manfaat-anggota">Baca Ketentuan Keanggotaan</Link>
    </Card>
  </div>;
}

import { publicApi } from '@/lib/api';
import { Card, Message } from '@shared/design/ui';

interface Section { heading?: string; body?: string }

export const dynamic = 'force-dynamic';

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let page;
  try {
    page = await publicApi.getContentPage(slug);
  } catch {
    return <Message title="Informasi belum tersedia" body="Silakan hubungi pengurus Kopdes untuk penjelasan resminya." actionLabel="Kembali ke Beranda" href="/" />;
  }
  const sections = Array.isArray(page.sections) ? page.sections as Section[] : [];
  return <article className="stack-lg kc-info-page">
    <header><h1 className="page-title">{page.title}</h1>{page.subtitle && <p className="page-sub">{page.subtitle}</p>}</header>
    {sections.filter((section) => section.heading || section.body).map((section, index) => <section key={`${section.heading ?? 'bagian'}-${index}`}>
      {section.heading && <h2 className="kc-section-head__title">{section.heading}</h2>}
      {section.body && <p className="kc-prose">{section.body}</p>}
    </section>)}
    {page.footnote && <Card><p className="t-caption">{page.footnote}</p></Card>}
  </article>;
}

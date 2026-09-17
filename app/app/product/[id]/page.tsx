import Link from 'next/link';
import { publicApi } from '@/lib/api';
import type { Product } from '@shared/api';
import ProductDetailClient from './ProductDetailClient';

// Detail produk (server component untuk SEO) — paritas dengan halaman mobile.
export const dynamic = 'force-dynamic';

async function getProduct(id: string): Promise<Product | null> {
  try {
    return await publicApi.getProduct(id);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);
  if (!product) return { title: 'Produk tidak ditemukan — KOPDES' };
  return {
    title: `${product.name} — KOPDES`,
    description: product.description?.slice(0, 150),
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);

  if (!product) {
    return (
      <div className="state">
        Produk tidak ditemukan.
        <br />
        <Link href="/" className="muted">
          ← Kembali ke marketplace
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link href="/" className="back-link">
        ← Kembali ke marketplace
      </Link>
      <ProductDetailClient product={product} />
    </>
  );
}

import { publicApi } from '@/lib/api';
import { Message } from '@shared/design/ui';
import { toRupiah } from '@shared/format';
import { ProductDetail, type ProductDetailData } from '@/components/ProductDetail';
import type { Product } from '@shared/api';

/**
 * Detail produk Kopdes — server component supaya nama dan harga sudah ada di
 * HTML: halaman ini yang dibagikan lewat tautan, jadi metadata-nya harus
 * terisi tanpa menunggu JavaScript.
 */
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
  if (!product) return { title: 'Produk tidak ditemukan — KMP Mitra' };
  return {
    title: `${product.name} — KMP Mitra`,
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
      <Message
        title="Produk tidak ditemukan"
        body="Produk mungkin sudah tidak dijual atau tautannya salah."
        actionLabel="Buka Marketplace"
        href="/marketplace"
      />
    );
  }

  const raw = product as Product & {
    discountPrice?: number | string | null;
    unit?: string;
    sku?: string | null;
    isPreOrderAllowed?: boolean;
    preOrderAvailableAt?: string | null;
    kopdes?: { name?: string } | null;
  };

  const data: ProductDetailData = {
    id: product.id,
    name: product.name,
    description: product.description,
    price: toRupiah(product.price),
    discountPrice: raw.discountPrice ? toRupiah(raw.discountPrice) : null,
    stock: product.stock,
    unit: raw.unit,
    sku: raw.sku ?? null,
    isPreOrderAllowed: raw.isPreOrderAllowed,
    preOrderAvailableAt: raw.preOrderAvailableAt ?? null,
    images: (product.images ?? [])
      .slice()
      // Gambar utama lebih dulu — itu yang dipilih admin untuk mewakili produk.
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
      .map((i) => i.url),
    sellerKind: 'KOPDES',
    sellerName: raw.kopdes?.name ?? 'Kopdes Merah Putih',
    categoryName: product.category?.name ?? null,
  };

  return <ProductDetail product={data} reviewRef={{ productId: product.id }} />;
}

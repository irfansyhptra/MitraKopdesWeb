import { publicApi } from '@/lib/api';
import { Message } from '@shared/design/ui';
import { toRupiah } from '@shared/format';
import { ProductDetail, type ProductDetailData } from '@/components/ProductDetail';

/**
 * Detail produk Mitra UMKM.
 *
 * Endpoint-nya terpisah dari produk Kopdes (`/umkm/products/:id`) dan
 * bentuknya sedikit berbeda, tapi layarnya sama — jadi pemetaannya dilakukan
 * di sini lalu diserahkan ke komponen yang sama.
 */
export const dynamic = 'force-dynamic';

type UmkmProductRaw = {
  id: string;
  name: string;
  description?: string;
  price?: number | string;
  discountPrice?: number | string | null;
  stock?: number;
  isPreOrderAllowed?: boolean;
  preOrderAvailableAt?: string | null;
  images?: Array<{ url: string; isPrimary?: boolean }>;
  category?: { name?: string } | null;
  umkm?: { businessName?: string } | null;
};

async function getProduct(id: string): Promise<UmkmProductRaw | null> {
  try {
    return (await publicApi.getUmkmProduct(id)) as UmkmProductRaw;
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

export default async function UmkmProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);

  if (!product) {
    return (
      <Message
        title="Produk tidak ditemukan"
        body="Produk mungkin sudah ditarik mitra atau tautannya salah."
        actionLabel="Buka Marketplace"
        href="/marketplace"
      />
    );
  }

  const data: ProductDetailData = {
    id: product.id,
    name: product.name,
    description: product.description ?? '',
    price: toRupiah(product.price),
    discountPrice: product.discountPrice ? toRupiah(product.discountPrice) : null,
    stock: product.stock ?? 0,
    isPreOrderAllowed: product.isPreOrderAllowed,
    preOrderAvailableAt: product.preOrderAvailableAt ?? null,
    images: (product.images ?? [])
      .slice()
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
      .map((i) => i.url),
    sellerKind: 'UMKM',
    sellerName: product.umkm?.businessName ?? 'Mitra UMKM',
    categoryName: product.category?.name ?? null,
  };

  return (
    <ProductDetail product={data} reviewRef={{ umkmProductId: product.id }} />
  );
}

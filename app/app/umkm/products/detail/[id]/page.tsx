'use client';

import { useParams } from 'next/navigation';
import { SellerProductForm } from '@/components/seller/SellerProductForm';

export default function SellerProductDetailAliasPage() {
  const { id } = useParams<{ id: string }>();
  return <SellerProductForm productId={id} />;
}

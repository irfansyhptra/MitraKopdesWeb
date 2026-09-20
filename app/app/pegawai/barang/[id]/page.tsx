'use client';

import { useParams } from 'next/navigation';
import { StaffProductForm } from '@/components/staff/ProductForm';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  return <StaffProductForm productId={id} />;
}

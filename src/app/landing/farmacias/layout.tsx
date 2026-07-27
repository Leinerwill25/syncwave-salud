import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata('farmacias');

export default function FarmaciasLayout({ children }: { children: React.ReactNode }) {
  return children;
}

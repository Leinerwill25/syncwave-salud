import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata('laboratorios');

export default function LaboratoriosLayout({ children }: { children: React.ReactNode }) {
  return children;
}

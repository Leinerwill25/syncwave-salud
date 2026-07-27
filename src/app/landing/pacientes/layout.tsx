import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata('pacientes');

export default function PacientesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

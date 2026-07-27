import type { Metadata } from 'next';
import { buildPageMetadata, faqPageJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata('enfermeros');

const enfermeroFaqs = [
  { q: '¿Puedo usar ASHIRA como enfermero independiente?', a: 'Sí. El plan Profesional está pensado para enfermeros independientes con triaje, MAR y reportes.' },
];

export default function EnfermerosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqPageJsonLd(enfermeroFaqs)} />
      {children}
    </>
  );
}

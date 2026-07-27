import type { Metadata } from 'next';
import { buildPageMetadata, faqPageJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';
import { clinicaPricing } from '@/config/ashira-content';

export const metadata: Metadata = buildPageMetadata('clinicas');

const clinicaFaqs = [
  {
    q: '¿Cómo se calcula el precio si mi clínica tiene varias sedes?',
    a: `El plan base se determina por el total de especialistas. La primera sede es gratis; sedes adicionales cuestan $${clinicaPricing.multiSede.seats2to4Usd} (2–4) o $${clinicaPricing.multiSede.seats5to10Usd} (5–10) por mes.`,
  },
];

export default function ClinicasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqPageJsonLd(clinicaFaqs)} />
      {children}
    </>
  );
}

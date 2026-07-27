import type { Metadata } from 'next';
import { buildPageMetadata, faqPageJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = buildPageMetadata('consultorios');

const consultorioFaqs = [
  { q: '¿Necesito tarjeta de crédito para registrarme?', a: 'No. Puedes registrarte y configurar tu consultorio totalmente gratis. Solo pagas cuando estés listo para suscribirte a un plan.' },
  { q: '¿Necesito instalar algo en mi computadora?', a: 'No. ASHIRA funciona 100% en la nube. Solo necesitas un navegador (Chrome, Safari, Edge) y conexión a internet.' },
];

export default function ConsultoriosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqPageJsonLd(consultorioFaqs)} />
      {children}
    </>
  );
}

import type { Metadata } from 'next';
import { seoByRoute, ASHIRA_SITE_URL, companyFaqs, consultorioPricing } from '@/config/ashira-content';

type SeoKey = keyof typeof seoByRoute;

export function buildPageMetadata(key: SeoKey, ogImage = `${ASHIRA_SITE_URL}/3.png`): Metadata {
  const s = seoByRoute[key];
  return {
    title: s.title,
    description: s.description,
    keywords: s.keywords,
    alternates: { canonical: s.canonical },
    openGraph: {
      title: s.title,
      description: s.description,
      url: s.canonical,
      siteName: 'ASHIRA',
      locale: 'es_VE',
      type: 'website',
      images: [{ url: ogImage, alt: 'ASHIRA — plataforma de salud digital' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: s.title,
      description: s.description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}

export function organizationSoftwareJsonLd() {
  return {
    '@type': ['SoftwareApplication', 'MedicalOrganization'],
    name: 'ASHIRA',
    url: ASHIRA_SITE_URL,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web, Android, iOS',
    description: seoByRoute.home.description,
    offers: {
      '@type': 'Offer',
      price: String(consultorioPricing.monthlyUsd),
      priceCurrency: 'USD',
      description: 'Plan Médico / Consultorio',
    },
    availableLanguage: 'es',
    areaServed: { '@type': 'Country', name: 'Venezuela' },
  };
}

export function faqPageJsonLd(faqs: readonly { q: string; a: string }[] = companyFaqs) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

import type { MetadataRoute } from 'next';
import { ASHIRA_SITE_URL } from '@/config/ashira-content';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const routes = [
    '',
    '/landing/consultorios',
    '/landing/clinicas',
    '/landing/enfermeros',
    '/landing/pacientes',
    '/landing/farmacias',
    '/landing/laboratorios',
  ];

  return routes.map((path) => ({
    url: `${ASHIRA_SITE_URL}${path || '/'}`,
    lastModified,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path.includes('farmacias') || path.includes('laboratorios') ? 0.5 : 0.8,
  }));
}

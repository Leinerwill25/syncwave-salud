import type { MetadataRoute } from 'next';
import { ASHIRA_SITE_URL } from '@/config/ashira-content';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/login/', '/invite/'],
    },
    sitemap: `${ASHIRA_SITE_URL}/sitemap.xml`,
  };
}

import type { Metadata } from 'next';
import { ASHIRA_SITE_URL } from '@/config/ashira-content';

export const metadata: Metadata = {
  metadataBase: new URL(ASHIRA_SITE_URL),
};

export default function LandingRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

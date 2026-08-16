// app/layout.tsx
import type { Metadata } from 'next';
import { Sora, DM_Sans, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import '../../public/globals.css';
import NavbarSwitcher from '@/components/NavbarSwitcher';
import ConditionalMain from '@/components/ConditionalMain';
import { Toaster } from 'sonner';
import QueryProvider from '@/providers/QueryProvider';
import SessionKeeper from '@/components/SessionKeeper';
import { buildPageMetadata, organizationSoftwareJsonLd, faqPageJsonLd } from '@/lib/seo';
import { companyFaqs } from '@/config/ashira-content';

const sora = Sora({
	subsets: ['latin'],
	weight: ['600', '700', '800'],
	variable: '--font-display',
	display: 'swap',
});

const dmSans = DM_Sans({
	subsets: ['latin'],
	weight: ['400', '500', '600'],
	variable: '--font-body',
	display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
	subsets: ['latin'],
	weight: ['500', '600', '700'],
	variable: '--font-stats',
	display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ['latin'],
	weight: ['400', '500'],
	variable: '--font-mono',
	display: 'swap',
});

const jsonLd = {
	'@context': 'https://schema.org',
	'@graph': [
		organizationSoftwareJsonLd(),
		faqPageJsonLd(companyFaqs),
		{
			'@type': 'Person',
			name: 'Dra. Carwin Silva',
			jobTitle: 'Ginecóloga Especialista — Embajadora Oficial ASHIRA',
			description:
				'Doctora Carwin Silva, ginecóloga especialista en ginecología regenerativa, funcional y estética en Venezuela.',
			image: 'https://ashira.click/consultorios/dracarwin/IMG_5189.JPG',
			knowsAbout: ['Ginecología', 'Ginecología Regenerativa', 'Ginecología Funcional', 'Ginecología Estética', 'Salud Femenina'],
			worksFor: { '@type': 'Organization', name: 'ASHIRA', url: 'https://ashira.click' },
		},
	],
};

export const metadata: Metadata = {
	...buildPageMetadata('home'),
	manifest: '/manifest.json',
	icons: {
		icon: '/icon.png',
		apple: '/apple-icon.png',
		shortcut: '/favicon.ico',
	},
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	const headersList = await headers();
	const nonce = headersList.get('x-nonce') || '';

	return (
		<html lang="es" className={`${sora.variable} ${dmSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} overflow-x-hidden`} style={{ colorScheme: 'light' }} suppressHydrationWarning={true}>
			<body 
				nonce={nonce} 
				className="antialiased overflow-x-hidden w-full max-w-full font-body" 
				style={{ backgroundColor: '#FFFFFF', color: '#0F2133' }}
				suppressHydrationWarning={true}
			>
				<script
					nonce={nonce}
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>
				<QueryProvider>
					<SessionKeeper />
					<NavbarSwitcher />
					<ConditionalMain>{children}</ConditionalMain>
					<Toaster position="top-right" richColors />
				</QueryProvider>
			</body>
		</html>
	);
}

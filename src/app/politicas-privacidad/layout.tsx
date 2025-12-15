import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
	title: 'Políticas de Privacidad - ASHIRA',
	description: 'Conozca nuestras políticas de privacidad y cómo protegemos su información personal y de salud en ASHIRA.',
	keywords: 'políticas de privacidad, protección de datos, privacidad médica, seguridad de datos, ASHIRA',
};

export default function PoliticasPrivacidadLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}

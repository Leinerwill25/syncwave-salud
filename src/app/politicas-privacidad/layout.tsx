import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
	title: 'Políticas de Privacidad - Syncwave Salud',
	description: 'Conozca nuestras políticas de privacidad y cómo protegemos su información personal y de salud en Syncwave Salud.',
	keywords: 'políticas de privacidad, protección de datos, privacidad médica, seguridad de datos, Syncwave Salud',
};

export default function PoliticasPrivacidadLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <>{children}</>;
}


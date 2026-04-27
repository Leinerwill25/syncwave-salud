// app/emergency/[token]/page.tsx
// Página pública para visualizar información crítica del paciente en emergencias

import { notFound } from 'next/navigation';
import EmergencyView from '@/components/emergency/EmergencyView';

type Props = {
	params: Promise<{ token: string }>;
};

export default async function EmergencyPage({ params }: Props) {
	const { token } = await params;

	if (!token) {
		notFound();
	}

	// Fetch data from API
	let emergencyData;
	try {
		// En Vercel, NEXT_PUBLIC_APP_URL debería estar configurada. 
		// Si no, intentamos usar VERCEL_URL o fallback a localhost.
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
			? process.env.NEXT_PUBLIC_APP_URL 
			: process.env.VERCEL_URL 
				? `https://${process.env.VERCEL_URL}` 
				: 'http://localhost:3000';

		console.log(`[Emergency Page] Fetching from: ${baseUrl}/api/emergency/${token}`);
		
		const response = await fetch(`${baseUrl}/api/emergency/${token}`, {
			cache: 'no-store',
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			console.error('[Emergency Page] API Error:', response.status, errorData);
			notFound();
		}

		emergencyData = await response.json();
	} catch (error) {
		console.error('[Emergency Page] Critical Error:', error);
		notFound();
	}

	return <EmergencyView data={emergencyData} />;
}


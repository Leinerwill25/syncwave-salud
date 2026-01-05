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
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
		const response = await fetch(`${baseUrl}/api/emergency/${token}`, {
			cache: 'no-store',
		});

		if (!response.ok) {
			notFound();
		}

		emergencyData = await response.json();
	} catch (error) {
		console.error('[Emergency Page] Error fetching data:', error);
		notFound();
	}

	return <EmergencyView data={emergencyData} />;
}


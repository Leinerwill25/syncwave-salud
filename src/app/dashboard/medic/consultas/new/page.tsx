'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ConsultationForm from '@/app/dashboard/medic/consultas/new/ConsultationForm';

export default function NewConsultationPage() {
	const [fetchingSession, setFetchingSession] = useState(true);

	useEffect(() => {
		async function fetchSession() {
			try {
				setFetchingSession(true);
				const res = await fetch('/api/auth/met', { method: 'GET', credentials: 'include', cache: 'no-store' });
				if (!res.ok) {
					setFetchingSession(false);
					return;
				}
				setFetchingSession(false);
			} catch (err) {
				console.error('Error fetching session:', err);
				setFetchingSession(false);
			}
		}
		fetchSession();
	}, []);

	if (fetchingSession) {
		return (
			<main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
				<div className="max-w-3xl mx-auto">
					<div className="bg-white/90 rounded-2xl shadow-lg border border-blue-100 p-6">
						<div className="flex items-center justify-center gap-2 text-slate-700">
							<Loader2 className="animate-spin" size={18} /> Cargando sesión...
						</div>
					</div>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
			<div className="max-w-6xl mx-auto">
				<ConsultationForm />
			</div>
		</main>
	);
}

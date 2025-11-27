'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ConsultationForm from './ConsultationForm';

export default function RoleUserNewConsultationPage() {
	const [fetchingSession, setFetchingSession] = useState(true);

	useEffect(() => {
		async function fetchSession() {
			try {
				setFetchingSession(true);
				const res = await fetch('/api/role-users/login', {
					method: 'GET',
					credentials: 'include',
					cache: 'no-store',
				});
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
					<div className="flex items-center justify-center min-h-[400px]">
						<div className="flex flex-col items-center gap-4">
							<Loader2 className="w-8 h-8 animate-spin text-teal-600" />
							<p className="text-slate-600">Verificando sesión...</p>
						</div>
					</div>
				</div>
			</main>
		);
	}

	return <ConsultationForm />;
}

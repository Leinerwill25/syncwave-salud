'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import ConsultationForm from '@/app/dashboard/medic/consultas/new/ConsultationForm';

export default function NewConsultationPage() {
	return (
		<main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
			<div className="max-w-3xl mx-auto">
				<div className="bg-white/90 rounded-2xl shadow-lg border border-blue-100 p-6">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h1 className="text-2xl font-semibold text-slate-900">Nueva Consulta</h1>
							<p className="mt-1 text-sm text-slate-700">Registra la consulta del paciente — información clínica y notas.</p>
						</div>
					</div>

					<React.Suspense
						fallback={
							<div className="flex items-center gap-2 text-slate-700">
								<Loader2 className="animate-spin" size={18} /> Cargando formulario...
							</div>
						}>
						<ConsultationForm />
					</React.Suspense>
				</div>
			</div>
		</main>
	);
}

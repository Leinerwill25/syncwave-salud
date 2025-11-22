'use client';

import React from 'react';
import Link from 'next/link';

interface PatientHistoryLinkProps {
	patientId: string | null;
	isUnregistered: boolean;
}

export default function PatientHistoryLink({ patientId, isUnregistered }: PatientHistoryLinkProps) {
	if (isUnregistered || !patientId) {
		return (
			<button
				type="button"
				onClick={() => {
					alert('Los pacientes no registrados no tienen historial completo en el sistema.');
				}}
				className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-blue-200 bg-white text-sm text-slate-900 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-400 opacity-50 cursor-not-allowed"
				aria-label="Ver historial del paciente"
			>
				Ver historial del paciente
			</button>
		);
	}

	return (
		<Link
			href={`/dashboard/medic/pacientes/${patientId}`}
			className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-blue-200 bg-white text-sm text-slate-900 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-teal-400"
			aria-label="Ver historial del paciente"
		>
			Ver historial del paciente
		</Link>
	);
}


// app/dashboard/medic/pacientes/[id]/PatientHistoryClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import AccessCodeModal from './AccessCodeModal';
import Link from 'next/link';

interface PatientHistoryClientProps {
	patientId: string;
	patientName: string;
	hasFullAccess: boolean;
	hasConsultation: boolean;
}

export default function PatientHistoryClient({
	patientId,
	patientName,
	hasFullAccess,
	hasConsultation,
}: PatientHistoryClientProps) {
	const [showAccessModal, setShowAccessModal] = useState(false);
	const [accessGranted, setAccessGranted] = useState(hasFullAccess);

	useEffect(() => {
		// Si no tiene acceso completo pero tiene consulta, mostrar modal
		if (!hasFullAccess && hasConsultation) {
			setShowAccessModal(true);
		}
	}, [hasFullAccess, hasConsultation]);

	const handleAccessSuccess = () => {
		setAccessGranted(true);
		setShowAccessModal(false);
		// Recargar la página para mostrar el historial completo
		window.location.reload();
	};

	if (!hasConsultation && !hasFullAccess) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10 px-6">
				<div className="max-w-3xl mx-auto">
					<div className="rounded-2xl bg-white border border-slate-200 shadow-md p-6">
						<div className="text-center py-8">
							<Lock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
							<h3 className="text-xl font-semibold text-slate-900 mb-2">Acceso Restringido</h3>
							<p className="text-slate-600 mb-6">
								No tienes consultas previas con este paciente. Para ver su historial médico completo, necesitas el código de acceso del paciente.
							</p>
							<button
								onClick={() => setShowAccessModal(true)}
								className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
							>
								Ingresar Código de Acceso
							</button>
							<div className="mt-4">
								<Link
									href="/dashboard/medic/pacientes"
									className="text-indigo-600 hover:underline text-sm"
								>
									Volver a pacientes
								</Link>
							</div>
						</div>
					</div>
				</div>
				<AccessCodeModal
					isOpen={showAccessModal}
					onClose={() => setShowAccessModal(false)}
					patientId={patientId}
					onSuccess={handleAccessSuccess}
				/>
			</div>
		);
	}

	if (!accessGranted && hasConsultation) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-10 px-6">
				<div className="max-w-3xl mx-auto">
					<div className="rounded-2xl bg-yellow-50 border-2 border-yellow-200 shadow-md p-6 mb-6">
						<div className="flex items-start gap-4">
							<AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
							<div className="flex-1">
								<h3 className="text-lg font-semibold text-yellow-900 mb-2">Acceso Limitado</h3>
								<p className="text-yellow-800 mb-4">
									Solo puedes ver las consultas que has realizado con este paciente. Para ver el historial médico completo, necesitas el código de acceso del paciente.
								</p>
								<button
									onClick={() => setShowAccessModal(true)}
									className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
								>
									Ingresar Código de Acceso
								</button>
							</div>
						</div>
					</div>
				</div>
				<AccessCodeModal
					isOpen={showAccessModal}
					onClose={() => setShowAccessModal(false)}
					patientId={patientId}
					onSuccess={handleAccessSuccess}
				/>
			</div>
		);
	}

	return null; // Si tiene acceso completo, no mostrar nada (el servidor renderiza el historial)
}


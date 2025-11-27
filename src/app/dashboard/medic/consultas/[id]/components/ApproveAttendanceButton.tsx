'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
	consultationId: string;
	facturacionId?: string | null;
	hasPendingPayment: boolean;
}

export default function ApproveAttendanceButton({ consultationId, facturacionId, hasPendingPayment }: Props) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const router = useRouter();

	const handleApprove = async () => {
		if (!confirm('¿Confirmas que el paciente asistió a la consulta y realizó el pago?')) {
			return;
		}

		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			const res = await fetch(`/api/consultations/${consultationId}/approve-attendance`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					approved: true,
					facturacionId: facturacionId || null,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Error al aprobar asistencia y pago');
			}

			setSuccess(true);
			// Recargar la página después de 1.5 segundos
			setTimeout(() => {
				router.refresh();
			}, 1500);
		} catch (err: any) {
			setError(err.message || 'Error desconocido');
		} finally {
			setLoading(false);
		}
	};

	if (!hasPendingPayment) {
		return null; // No mostrar el botón si no hay pago pendiente
	}

	return (
		<div className="space-y-2">
			<button
				onClick={handleApprove}
				disabled={loading || success}
				className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md"
			>
				{loading ? (
					<>
						<Loader2 className="w-4 h-4 animate-spin" />
						<span>Procesando...</span>
					</>
				) : success ? (
					<>
						<CheckCircle className="w-4 h-4" />
						<span>¡Aprobado!</span>
					</>
				) : (
					<>
						<CheckCircle className="w-4 h-4" />
						<span>Aprobar Asistencia y Pago</span>
					</>
				)}
			</button>

			{error && (
				<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
					<XCircle className="w-4 h-4" />
					<span>{error}</span>
				</div>
			)}

			{success && (
				<div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
					<CheckCircle className="w-4 h-4" />
					<span>Asistencia y pago aprobados correctamente. La facturación ha sido marcada como pagada.</span>
				</div>
			)}
		</div>
	);
}

